import { eq } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import {
  biayaTakTerduga,
  nasabah,
  pinjaman,
  transaksi,
  transferSetoran,
} from "../../../platform/db/skema";
import { iso, kolektor } from "./data";

/** Pemeta & kueri pilihan TRANSFER SETORAN dan BIAYA TAK TERDUGA — dipakai operasi catat/batal-nya. */
const kolomTransfer = {
  id: transferSetoran.id,
  transaksiId: transferSetoran.transaksiId,
  nasabahId: nasabah.id,
  nasabahNama: nasabah.nama,
  jenis: transaksi.jenis,
  nominal: transferSetoran.nominal,
  dibuatAt: transferSetoran.dibuatAt,
  dibatalkanAt: transferSetoran.dibatalkanAt,
  alasanBatal: transferSetoran.alasanBatal,
};
export const keTransfer = (t: {
  id: string;
  transaksiId: string;
  nasabahId: string;
  nasabahNama: string;
  jenis: "angsuran" | "pelunasan" | "gulung";
  nominal: number;
  dibuatAt: Date;
  dibatalkanAt: Date | null;
  alasanBatal: string | null;
}) => ({
  id: t.id,
  transaksiId: t.transaksiId,
  nasabah: { id: t.nasabahId, nama: t.nasabahNama },
  jenis: t.jenis,
  nominal: t.nominal,
  dibuatAt: t.dibuatAt.toISOString(),
  dibatalkanAt: iso(t.dibatalkanAt),
  alasanBatal: t.alasanBatal,
});
export const pilihTransfer = (db: Db) =>
  db
    .select(kolomTransfer)
    .from(transferSetoran)
    .innerJoin(transaksi, eq(transaksi.id, transferSetoran.transaksiId))
    .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
    .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId));

const kolomBiaya = {
  id: biayaTakTerduga.id,
  kolektorId: biayaTakTerduga.kolektorId,
  kolektorNama: kolektor.nama,
  tanggal: biayaTakTerduga.tanggal,
  nominal: biayaTakTerduga.nominal,
  keterangan: biayaTakTerduga.keterangan,
  dibuatAt: biayaTakTerduga.dibuatAt,
  dibatalkanAt: biayaTakTerduga.dibatalkanAt,
  alasanBatal: biayaTakTerduga.alasanBatal,
};
export const keBiaya = (b: {
  id: string;
  kolektorId: string;
  kolektorNama: string;
  tanggal: string;
  nominal: number;
  keterangan: string;
  dibuatAt: Date;
  dibatalkanAt: Date | null;
  alasanBatal: string | null;
}) => ({
  id: b.id,
  kolektor: { id: b.kolektorId, nama: b.kolektorNama },
  tanggal: b.tanggal,
  nominal: b.nominal,
  keterangan: b.keterangan,
  dibuatAt: b.dibuatAt.toISOString(),
  dibatalkanAt: iso(b.dibatalkanAt),
  alasanBatal: b.alasanBatal,
});
export const pilihBiaya = (db: Db) =>
  db
    .select(kolomBiaya)
    .from(biayaTakTerduga)
    .innerJoin(kolektor, eq(kolektor.id, biayaTakTerduga.kolektorId));
