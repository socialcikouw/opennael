import type { BatalInput } from "@opennael/contracts";
import { and, eq } from "drizzle-orm";
import { biayaTakTerduga } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import {
  batalHanyaHariIni,
  kasSudahDiterimaGalat,
  sudahDibatalkan,
  tidakDitemukan,
} from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { type Konteks, keBiaya, pilihBiaya } from "../data";
import { kasSudahDiterima } from "../kunci-hari";

export function buatBatalBiaya(k: Konteks) {
  /** Batal biaya (bos): hari yang sama, kas belum diterima. */
  return async function batalBiaya(aktor: Aktor, id: string, input: BatalInput) {
    wajibPeran(aktor, "bos");
    const tanggalIni = await k.hariIni(aktor);
    return k.db.transaction(async (tx) => {
      const [b] = await tx
        .select({
          dibatalkanAt: biayaTakTerduga.dibatalkanAt,
          kolektorId: biayaTakTerduga.kolektorId,
          tanggal: biayaTakTerduga.tanggal,
        })
        .from(biayaTakTerduga)
        .where(and(eq(biayaTakTerduga.id, id), eq(biayaTakTerduga.kantorId, aktor.kantorId)))
        .for("update");
      if (!b) throw tidakDitemukan("BIAYA_TIDAK_DITEMUKAN", "Biaya tidak ditemukan");
      if (b.dibatalkanAt) throw sudahDibatalkan();
      if (b.tanggal !== tanggalIni) throw batalHanyaHariIni();
      if (await kasSudahDiterima(tx, b.kolektorId, b.tanggal, "share")) {
        throw kasSudahDiterimaGalat();
      }
      await tx
        .update(biayaTakTerduga)
        .set({
          dibatalkanAt: k.sekarang(),
          dibatalkanOleh: aktor.penggunaId,
          alasanBatal: input.alasan,
        })
        .where(eq(biayaTakTerduga.id, id));
      const [hasil] = await pilihBiaya(tx).where(eq(biayaTakTerduga.id, id));
      if (!hasil) throw new Error("biaya hilang");
      return keBiaya(hasil);
    });
  };
}
