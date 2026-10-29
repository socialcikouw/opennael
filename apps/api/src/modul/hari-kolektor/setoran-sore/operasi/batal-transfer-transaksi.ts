import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "../../../../platform/db/klien";
import { transferSetoran } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";

/**
 * Membatalkan transfer setoran yang masih berlaku milik sebuah transaksi —
 * dipanggil pembatalan transaksi dalam `tx` yang sama. Mengembalikan jumlah
 * transfer yang dibatalkan.
 */
export async function batalTransferTransaksi(
  tx: Db,
  aktor: Aktor,
  transaksiId: string,
  sekarang: Date,
): Promise<number> {
  const dibatalkan = await tx
    .update(transferSetoran)
    .set({
      dibatalkanAt: sekarang,
      dibatalkanOleh: aktor.penggunaId,
      alasanBatal: "transaksi dibatalkan",
    })
    .where(and(eq(transferSetoran.transaksiId, transaksiId), isNull(transferSetoran.dibatalkanAt)))
    .returning({ id: transferSetoran.id });
  return dibatalkan.length;
}
