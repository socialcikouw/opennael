import type { UbahHariIniInput } from "@opennael/contracts";
import { eq } from "drizzle-orm";
import { hariKolektor } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import { melanggar } from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { catatRiwayat } from "../../../../platform/riwayat";
import { type Konteks, kunciHariMasukKerja, namaKolektor, satuHari } from "../data";

export function buatUbahHariIni(k: Konteks) {
  /** Pembetulan kas lapangan / uang jalan (bos, hari ini, sebelum kas diterima). */
  return async function ubahHariIni(aktor: Aktor, kolektorId: string, input: UbahHariIniInput) {
    wajibPeran(aktor, "bos");
    const tanggal = await k.hariIni(aktor);
    await namaKolektor(k.db, aktor, kolektorId);
    return k.db.transaction(async (tx) => {
      const h = await kunciHariMasukKerja(tx, kolektorId, tanggal);
      const sebelum: Record<string, number> = {};
      const sesudah: Record<string, number> = {};
      for (const k of ["kasLapangan", "uangJalan"] as const) {
        const baru = input[k];
        if (baru !== undefined && baru !== h[k]) {
          sebelum[k] = h[k];
          sesudah[k] = baru;
        }
      }
      if (Object.keys(sesudah).length === 0) {
        throw melanggar("TIDAK_ADA_PERUBAHAN", "Angkanya sudah sama");
      }
      await tx.update(hariKolektor).set(sesudah).where(eq(hariKolektor.id, h.id));
      await catatRiwayat(tx, {
        kantorId: aktor.kantorId,
        tabel: "hari_kolektor",
        barisId: h.id,
        aksi: "perbaiki_hari_kolektor",
        sebelum,
        sesudah,
        pelakuId: aktor.penggunaId,
      });
      return satuHari(tx, aktor, kolektorId, tanggal);
    });
  };
}
