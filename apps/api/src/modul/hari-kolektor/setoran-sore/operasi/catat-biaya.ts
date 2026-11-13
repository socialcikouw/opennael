import type { BiayaInput } from "@opennael/contracts";
import { and, eq } from "drizzle-orm";
import { biayaTakTerduga, hariKolektor } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import { kasSudahDiterimaGalat, melanggar } from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { type Konteks, namaKolektor } from "../data";
import { kasSudahDiterima } from "../kunci-hari";
import { keBiaya, pilihBiaya } from "../transfer-biaya";

export function buatCatatBiaya(k: Konteks) {
  /** Catat biaya (kasir/bos): hari ini, kolektor masuk kerja, kas belum diterima. */
  return async function catatBiaya(aktor: Aktor, input: BiayaInput) {
    wajibPeran(aktor, "kasir", "bos");
    const tanggal = await k.hariIni(aktor);
    await namaKolektor(k.db, aktor, input.kolektorId);
    return k.db.transaction(async (tx) => {
      const [h] = await tx
        .select({ absensi: hariKolektor.absensi })
        .from(hariKolektor)
        .where(
          and(eq(hariKolektor.kolektorId, input.kolektorId), eq(hariKolektor.tanggal, tanggal)),
        )
        .limit(1);
      if (!h) throw melanggar("BELUM_ABSEN", "Kolektor ini belum absen hari ini");
      if (h.absensi !== "masuk_kerja") {
        throw melanggar("TIDAK_KERJA_HARI_INI", "Kolektor ini tercatat tidak kerja hari ini");
      }
      if (await kasSudahDiterima(tx, input.kolektorId, tanggal, "share")) {
        throw kasSudahDiterimaGalat();
      }
      const [baru] = await tx
        .insert(biayaTakTerduga)
        .values({
          kantorId: aktor.kantorId,
          kolektorId: input.kolektorId,
          tanggal,
          nominal: input.nominal,
          keterangan: input.keterangan,
          dibuatOleh: aktor.penggunaId,
        })
        .returning({ id: biayaTakTerduga.id });
      if (!baru) throw new Error("biaya tak tersimpan");
      const [hasil] = await pilihBiaya(tx).where(eq(biayaTakTerduga.id, baru.id));
      if (!hasil) throw new Error("biaya hilang");
      return keBiaya(hasil);
    });
  };
}
