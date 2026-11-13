import type { BatalInput } from "@opennael/contracts";
import { eq } from "drizzle-orm";
import { hariKolektor } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import { melanggar } from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { catatRiwayat } from "../../../../platform/riwayat";
import { type Konteks, kunciHariMasukKerja, namaKolektor, satuHari } from "../data";

export function buatBatalLaporan(k: Konteks) {
  /** Buka kembali hari kolektor yang sudah lapor (bos, hari ini, sebelum kas diterima). */
  return async function batalLaporan(aktor: Aktor, kolektorId: string, input: BatalInput) {
    wajibPeran(aktor, "bos");
    const tanggal = await k.hariIni(aktor);
    await namaKolektor(k.db, aktor, kolektorId);
    return k.db.transaction(async (tx) => {
      const h = await kunciHariMasukKerja(tx, kolektorId, tanggal);
      if (!h.laporanDibukaAt) {
        throw melanggar("LAPORAN_BELUM_DIBUKA", "Kolektor belum membuka laporan hari ini");
      }
      await tx.update(hariKolektor).set({ laporanDibukaAt: null }).where(eq(hariKolektor.id, h.id));
      await catatRiwayat(tx, {
        kantorId: aktor.kantorId,
        tabel: "hari_kolektor",
        barisId: h.id,
        aksi: "batal_laporan",
        sebelum: { laporanDibukaAt: h.laporanDibukaAt.toISOString() },
        sesudah: { laporanDibukaAt: null },
        alasan: input.alasan,
        pelakuId: aktor.penggunaId,
      });
      return satuHari(tx, aktor, kolektorId, tanggal);
    });
  };
}
