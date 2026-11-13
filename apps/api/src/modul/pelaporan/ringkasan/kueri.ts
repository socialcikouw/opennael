import type { JenisPerforma } from "@opennael/contracts";
import { gabungPerforma, selisihHari } from "@opennael/domain";
import { asc, eq } from "drizzle-orm";
import { pengguna } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { melanggar } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { angka } from "./angka";
import { type Konteks, RENTANG_PERFORMA_MAKS, saring } from "./data";
import { performaHarian, performaPeriodik } from "./performa";

/** Bacaan RINGKASAN: angka satu rentang, per kolektor, dan deret performa penagihan. */
export function buatKueriRingkasan(k: Konteks) {
  return {
    /** Angka satu rentang — kantor, atau satu kolektor. */
    async ringkasan(aktor: Aktor, s: { mulai?: string; selesai?: string; kolektorId?: string }) {
      const { kolektorId, mulai, selesai } = await saring(k, aktor, s);
      return { mulai, selesai, ...(await angka(k, aktor, mulai, selesai, kolektorId)) };
    },

    /** Angka satu rentang per kolektor (bos, pengawas). */
    async perKolektor(aktor: Aktor, s: { mulai?: string; selesai?: string }) {
      wajibPeran(aktor, "bos", "pengawas");
      const { mulai, selesai } = await saring(k, aktor, s);
      const kolektor = await k.db
        .select({ id: pengguna.id, nama: pengguna.nama })
        .from(pengguna)
        .where(eq(pengguna.kolektorKantorId, aktor.kantorId))
        .orderBy(asc(pengguna.nama));
      return Promise.all(
        kolektor.map(async (orang) => ({
          kolektor: orang,
          ...(await angka(k, aktor, mulai, selesai, orang.id)),
        })),
      );
    },

    /**
     * Deret performa penagihan harian (aturan-usaha N) — paling panjang 366 hari.
     * `jenis`: harian (bawaan, N1), mingguan · tempoan (N3), semua (N4).
     */
    async performa(
      aktor: Aktor,
      s: { mulai?: string; selesai?: string; kolektorId?: string; jenis?: JenisPerforma },
    ) {
      const { kolektorId, mulai, selesai } = await saring(k, aktor, s);
      if (selisihHari(mulai, selesai) >= RENTANG_PERFORMA_MAKS) {
        throw melanggar("RENTANG_TERLALU_PANJANG", `Paling panjang ${RENTANG_PERFORMA_MAKS} hari`);
      }
      const jenis = s.jenis ?? "harian";
      if (jenis === "harian") return performaHarian(k, aktor, kolektorId, mulai, selesai);
      if (jenis === "semua") {
        // N4: ketiga deret mencakup tanggal yang sama, jadi sejajar menurut indeks.
        const harian = await performaHarian(k, aktor, kolektorId, mulai, selesai);
        const mingguan = await performaPeriodik(k, aktor, "mingguan", kolektorId, mulai, selesai);
        const tempoan = await performaPeriodik(k, aktor, "tempoan", kolektorId, mulai, selesai);
        return harian.map((h, i) => {
          const lain = [mingguan[i], tempoan[i]].flatMap((x) => (x ? [x] : []));
          return { tanggal: h.tanggal, ...gabungPerforma([h, ...lain]) };
        });
      }
      return performaPeriodik(k, aktor, jenis, kolektorId, mulai, selesai);
    },
  };
}
