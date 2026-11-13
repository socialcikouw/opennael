import type { BatalInput } from "@opennael/contracts";
import { and, eq } from "drizzle-orm";
import { transaksi, transferSetoran } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import {
  batalHanyaHariIni,
  kasSudahDiterimaGalat,
  sudahDibatalkan,
  tidakDitemukan,
} from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { type Konteks, keTransfer, pilihTransfer } from "../data";
import { kasSudahDiterima } from "../kunci-hari";

export function buatBatalTransfer(k: Konteks) {
  /** Batal transfer (bos): hari yang sama, kas belum diterima. */
  return async function batalTransfer(aktor: Aktor, id: string, input: BatalInput) {
    wajibPeran(aktor, "bos");
    const tanggalIni = await k.hariIni(aktor);
    return k.db.transaction(async (tx) => {
      const [t] = await tx
        .select({
          dibatalkanAt: transferSetoran.dibatalkanAt,
          pencatatId: transaksi.pencatatId,
          tanggal: transaksi.tanggal,
        })
        .from(transferSetoran)
        .innerJoin(transaksi, eq(transaksi.id, transferSetoran.transaksiId))
        .where(and(eq(transferSetoran.id, id), eq(transferSetoran.kantorId, aktor.kantorId)))
        .for("update", { of: transferSetoran });
      if (!t) throw tidakDitemukan("TRANSFER_TIDAK_DITEMUKAN", "Transfer tidak ditemukan");
      if (t.dibatalkanAt) throw sudahDibatalkan();
      if (t.tanggal !== tanggalIni) throw batalHanyaHariIni();
      if (await kasSudahDiterima(tx, t.pencatatId, t.tanggal, "share")) {
        throw kasSudahDiterimaGalat();
      }
      await tx
        .update(transferSetoran)
        .set({
          dibatalkanAt: k.sekarang(),
          dibatalkanOleh: aktor.penggunaId,
          alasanBatal: input.alasan,
        })
        .where(eq(transferSetoran.id, id));
      const [hasil] = await pilihTransfer(tx).where(eq(transferSetoran.id, id));
      if (!hasil) throw new Error("transfer hilang");
      return keTransfer(hasil);
    });
  };
}
