import type { UbahKantorInput } from "@opennael/contracts";
import { bitmaskKeHari, menitDariJam } from "@opennael/domain";
import { and, desc, eq, lte } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { kantor, pekanKerja } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { melanggar } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { catatRiwayat } from "../../../platform/riwayat";
import { bacaKalender } from "../kalender/kalender";

/**
 * PROFIL KANTOR — nama, zona waktu, jam buka/tutup + pola hari kerja yang
 * berlaku hari ini. Membaca: semua peran; menulis: bos (tercatat di riwayat).
 * Docs: schema-kantor.md.
 */
export interface ProfilDeps {
  db: Db;
  sekarang?: () => Date;
}

const jamHHMM = (t: string) => t.slice(0, 5);

export function buatLayananProfil(deps: ProfilDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const hariIni = async (aktor: Aktor) =>
    (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal;

  async function bacaKantor(db: Db, aktor: Aktor) {
    const [k] = await db.select().from(kantor).where(eq(kantor.id, aktor.kantorId));
    if (!k) throw new Error("kantor hilang");
    const [pola] = await db
      .select({ hariKerja: pekanKerja.hariKerja })
      .from(pekanKerja)
      .where(
        and(
          eq(pekanKerja.kantorId, aktor.kantorId),
          lte(pekanKerja.berlakuMulai, await hariIni(aktor)),
        ),
      )
      .orderBy(desc(pekanKerja.berlakuMulai))
      .limit(1);
    return {
      id: k.id,
      nama: k.nama,
      zonaWaktu: k.zonaWaktu,
      hariKerja: pola ? bitmaskKeHari(pola.hariKerja) : [],
      jamBuka: jamHHMM(k.jamBuka),
      jamTutup: jamHHMM(k.jamTutup),
    };
  }

  return {
    /** Profil kantor + pola hari kerja yang berlaku hari ini (semua peran). */
    kantor: (aktor: Aktor) => bacaKantor(deps.db, aktor),

    /** Ubah profil kantor (bos) — kolom yang berubah tercatat di riwayat. */
    async ubahKantor(aktor: Aktor, input: UbahKantorInput) {
      wajibPeran(aktor, "bos");
      return deps.db.transaction(async (tx) => {
        const lama = await bacaKantor(tx, aktor);
        const baru = {
          ...lama,
          ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
        };
        if (menitDariJam(baru.jamBuka) >= menitDariJam(baru.jamTutup)) {
          throw melanggar("JAM_TIDAK_SAH", "Jam buka harus sebelum jam tutup");
        }
        const sebelum: Record<string, unknown> = {};
        const sesudah: Record<string, unknown> = {};
        for (const k of ["nama", "zonaWaktu", "jamBuka", "jamTutup"] as const) {
          if (baru[k] !== lama[k]) {
            sebelum[k] = lama[k];
            sesudah[k] = baru[k];
          }
        }
        if (Object.keys(sesudah).length === 0) return lama;
        await tx.update(kantor).set(sesudah).where(eq(kantor.id, aktor.kantorId));
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "kantor",
          barisId: aktor.kantorId,
          aksi: "ubah_kantor",
          sebelum,
          sesudah,
          pelakuId: aktor.penggunaId,
        });
        return bacaKantor(tx, aktor);
      });
    },
  };
}

export type LayananProfil = ReturnType<typeof buatLayananProfil>;
