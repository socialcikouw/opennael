import type { BatalInput } from "@opennael/contracts";
import { and, eq } from "drizzle-orm";
import { pinjaman } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import {
  batalHanyaHariIni,
  kasSudahDiterimaGalat,
  melanggar,
  sudahDibatalkan,
  tidakDitemukan,
} from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { kasSudahDiterima } from "../../../hari-kolektor";
import { adaPeristiwa, geserTabungan, type Konteks, tandaBatal } from "../data";

export function buatBatalAkad(k: Konteks) {
  /** Batal akad salah input (bos): hari akad, sebelum ada peristiwa & kas pencair diterima. */
  return async function batalAkad(aktor: Aktor, id: string, input: BatalInput) {
    wajibPeran(aktor, "bos");
    const tanggalIni = await k.hariIni(aktor);
    return k.db.transaction(async (tx) => {
      const [p] = await tx
        .select()
        .from(pinjaman)
        .where(and(eq(pinjaman.id, id), eq(pinjaman.kantorId, aktor.kantorId)))
        .for("update");
      if (!p) throw tidakDitemukan("PINJAMAN_TIDAK_DITEMUKAN", "Pinjaman tidak ditemukan");
      if (p.status === "batal") throw sudahDibatalkan();
      if (p.asal === "gulung") {
        throw melanggar(
          "BATAL_LEWAT_GULUNG",
          "Akad gulung dibatalkan lewat batal transaksi gulung pinjaman asalnya",
        );
      }
      // Salinan migrasi (A10): hari disalin; boleh disalin macet; tanpa uang keluar.
      const salinan = p.asal === "migrasi";
      if ((salinan ? p.tanggalDisalin : p.tanggalAkad) !== tanggalIni) throw batalHanyaHariIni();
      const statusAwal = salinan ? ["berjalan", "macet"] : ["berjalan"];
      if (!statusAwal.includes(p.status) || (await adaPeristiwa(tx, p.id))) {
        throw melanggar(
          "PINJAMAN_SUDAH_BERPERISTIWA",
          "Pinjaman ini sudah punya catatan — akad tak bisa dibatalkan",
        );
      }
      if (!salinan && (await kasSudahDiterima(tx, p.pencairId, p.tanggalAkad, "share"))) {
        throw kasSudahDiterimaGalat();
      }
      await tx
        .update(pinjaman)
        .set({
          status: "batal",
          tanggalSelesai: tanggalIni,
          tanggalMacet: null,
          ...tandaBatal(k, aktor, input.alasan),
        })
        .where(eq(pinjaman.id, p.id));
      await geserTabungan(tx, p.nasabahId, -p.tabunganMasuk);
      return {
        id: p.id,
        status: "batal" as const,
        alasanBatal: input.alasan,
        tabunganDitarik: p.tabunganMasuk,
      };
    });
  };
}
