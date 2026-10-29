import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { liburNasabah, transaksi } from "../../../platform/db/skema";
import { bentrok } from "../../../platform/http/galat";

export async function pastikanBelumAdaPeristiwa(tx: Db, pinjamanId: string, tanggal: string) {
  const [t] = await tx
    .select({ id: transaksi.id })
    .from(transaksi)
    .where(
      and(
        eq(transaksi.pinjamanId, pinjamanId),
        eq(transaksi.tanggal, tanggal),
        isNull(transaksi.dibatalkanAt),
      ),
    )
    .limit(1);
  const [l] = await tx
    .select({ id: liburNasabah.id })
    .from(liburNasabah)
    .where(and(eq(liburNasabah.pinjamanId, pinjamanId), eq(liburNasabah.tanggal, tanggal)))
    .limit(1);
  if (t || l) throw bentrok("PERISTIWA_SUDAH_ADA", "Pinjaman ini sudah punya catatan hari ini");
}

export const kolomTransaksi = {
  id: transaksi.id,
  pinjamanId: transaksi.pinjamanId,
  tanggal: transaksi.tanggal,
  jenis: transaksi.jenis,
  setoranMurni: transaksi.setoranMurni,
  setoranPelunasan: transaksi.setoranPelunasan,
  tabunganKeluar: transaksi.tabunganKeluar,
  storting: transaksi.storting,
  saldoSesudah: transaksi.saldoSesudah,
};
