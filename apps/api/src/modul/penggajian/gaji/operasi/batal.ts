import type { BatalInput } from "@opennael/contracts";
import { and, eq } from "drizzle-orm";
import { pembayaranGaji } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import {
  batalHanyaHariIni,
  sudahDibatalkan,
  tidakDitemukan,
} from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { type Konteks, keSlip, pilihSlip } from "../data";

export function buatBatalGaji(k: Konteks) {
  /** Batal pembayaran gaji (bos, hari yang sama) — periodenya bisa dibayar ulang. */
  return async function batal(aktor: Aktor, id: string, input: BatalInput) {
    wajibPeran(aktor, "bos");
    const tanggal = await k.hariIni(aktor);
    return k.db.transaction(async (tx) => {
      const [g] = await tx
        .select({
          tanggalBayar: pembayaranGaji.tanggalBayar,
          dibatalkanAt: pembayaranGaji.dibatalkanAt,
        })
        .from(pembayaranGaji)
        .where(and(eq(pembayaranGaji.id, id), eq(pembayaranGaji.kantorId, aktor.kantorId)))
        .for("update");
      if (!g) throw tidakDitemukan("GAJI_TIDAK_DITEMUKAN", "Pembayaran gaji tidak ditemukan");
      if (g.dibatalkanAt) throw sudahDibatalkan();
      if (g.tanggalBayar !== tanggal) throw batalHanyaHariIni();
      await tx
        .update(pembayaranGaji)
        .set({
          dibatalkanAt: k.sekarang(),
          dibatalkanOleh: aktor.penggunaId,
          alasanBatal: input.alasan,
        })
        .where(eq(pembayaranGaji.id, id));
      const [slip] = await pilihSlip(tx).where(eq(pembayaranGaji.id, id));
      if (!slip) throw new Error("slip hilang");
      return keSlip(slip);
    });
  };
}
