import type { TransferInput } from "@opennael/contracts";
import { batasTransfer } from "@opennael/domain";
import { and, eq, isNull } from "drizzle-orm";
import { transaksi, transferSetoran } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import {
  bentrok,
  kasSudahDiterimaGalat,
  melanggar,
  tidakDitemukan,
} from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { type Konteks, keTransfer, pilihTransfer } from "../data";
import { kasSudahDiterima } from "../kunci-hari";

export function buatCatatTransfer(k: Konteks) {
  /** Catat transfer (kasir/bos): setoran hari ini, dalam batas I3, kas belum diterima. */
  return async function catatTransfer(aktor: Aktor, input: TransferInput) {
    wajibPeran(aktor, "kasir", "bos");
    const tanggalIni = await k.hariIni(aktor);
    return k.db.transaction(async (tx) => {
      const [t] = await tx
        .select({
          pencatatId: transaksi.pencatatId,
          tanggal: transaksi.tanggal,
          jenis: transaksi.jenis,
          setoranMurni: transaksi.setoranMurni,
          setoranPelunasan: transaksi.setoranPelunasan,
          dibatalkanAt: transaksi.dibatalkanAt,
        })
        .from(transaksi)
        .where(and(eq(transaksi.id, input.transaksiId), eq(transaksi.kantorId, aktor.kantorId)))
        .limit(1);
      if (!t) throw tidakDitemukan("SETORAN_TIDAK_DITEMUKAN", "Setoran tidak ditemukan");
      if (t.dibatalkanAt) throw melanggar("SETORAN_BATAL", "Setoran ini sudah dibatalkan");
      if (t.tanggal !== tanggalIni) {
        throw melanggar("BUKAN_SETORAN_HARI_INI", "Transfer hanya dicatat untuk setoran hari ini");
      }
      const batas = batasTransfer(t);
      if (batas === 0) {
        throw melanggar(
          "TRANSFER_TIDAK_BOLEH",
          "Setoran gulung tidak dibayar nasabah — tak bisa ditransfer",
        );
      }
      if (input.nominal > batas) {
        throw melanggar(
          "TRANSFER_MELEBIHI_SETORAN",
          `Transfer paling banyak Rp ${batas.toLocaleString("id-ID")}`,
        );
      }
      if (await kasSudahDiterima(tx, t.pencatatId, t.tanggal, "share")) {
        throw kasSudahDiterimaGalat();
      }
      const [ada] = await tx
        .select({ id: transferSetoran.id })
        .from(transferSetoran)
        .where(
          and(
            eq(transferSetoran.transaksiId, input.transaksiId),
            isNull(transferSetoran.dibatalkanAt),
          ),
        )
        .limit(1);
      if (ada) {
        throw bentrok("TRANSFER_SUDAH_ADA", "Setoran ini sudah dicatat transfer — batalkan dulu");
      }
      const [baru] = await tx
        .insert(transferSetoran)
        .values({
          kantorId: aktor.kantorId,
          transaksiId: input.transaksiId,
          nominal: input.nominal,
          dibuatOleh: aktor.penggunaId,
        })
        .returning({ id: transferSetoran.id });
      if (!baru) throw new Error("transfer tak tersimpan");
      const [hasil] = await pilihTransfer(tx).where(eq(transferSetoran.id, baru.id));
      if (!hasil) throw new Error("transfer hilang");
      return keTransfer(hasil);
    });
  };
}
