import { and, eq, gte, isNotNull, lt, ne, or } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import {
  biayaTakTerduga,
  hariKolektor,
  koreksiTabungan,
  mutasiKasKantor,
  nasabah,
  pembayaranGaji,
  penarikanTabungan,
  pencocokanKas,
  pinjaman,
  serahTerimaKas,
  transaksi,
  transferSetoran,
} from "../../../platform/db/skema";
import { batalnya, sasaran } from "./data";

/** Sebelas kueri baris uang bertanggal `tanggal` (dicatat atau dibatalkan hari itu), berjalan sejajar. */
export async function bacaBarisUang(
  db: Db,
  kantorId: string,
  tanggal: string,
  mulai: Date,
  selesai: Date,
  bos: boolean,
) {
  const [akad, putih, batalSetoran, transfer, terima, biaya, mutasi, gaji, tarik, koreksi, cocok] =
    await Promise.all([
      db
        .select({
          id: pinjaman.id,
          dibuatAt: pinjaman.dibuatAt,
          dibuatOleh: pinjaman.dibuatOleh,
          ...batalnya(pinjaman),
          nasabah: nasabah.nama,
          asal: pinjaman.asal,
          jenis: pinjaman.jenis,
          pinjamanKe: pinjaman.pinjamanKe,
          pokok: pinjaman.pokok,
          saldoAwal: pinjaman.saldoAwal,
        })
        .from(pinjaman)
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .where(
          and(
            eq(pinjaman.kantorId, kantorId),
            // Akad lapangan pada tanggal akadnya; salinan migrasi pada hari disalin.
            or(
              and(ne(pinjaman.asal, "migrasi"), eq(pinjaman.tanggalAkad, tanggal)),
              and(eq(pinjaman.asal, "migrasi"), eq(pinjaman.tanggalDisalin, tanggal)),
            ),
          ),
        ),
      db
        .select({
          id: pinjaman.id,
          waktu: pinjaman.diputihkanAt,
          pelakuId: pinjaman.diputihkanOleh,
          alasan: pinjaman.alasanPemutihan,
          keterangan: pinjaman.keteranganPemutihan,
          nasabah: nasabah.nama,
          saldo: pinjaman.saldo,
        })
        .from(pinjaman)
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .where(
          and(
            eq(pinjaman.kantorId, kantorId),
            gte(pinjaman.diputihkanAt, mulai),
            lt(pinjaman.diputihkanAt, selesai),
          ),
        ),
      db
        .select({
          id: transaksi.id,
          waktu: transaksi.dibatalkanAt,
          pelakuId: transaksi.dibatalkanOleh,
          alasan: transaksi.alasanBatal,
          nasabah: nasabah.nama,
          setoranMurni: transaksi.setoranMurni,
          setoranPelunasan: transaksi.setoranPelunasan,
        })
        .from(transaksi)
        .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .where(
          and(
            eq(transaksi.kantorId, kantorId),
            eq(transaksi.tanggal, tanggal),
            isNotNull(transaksi.dibatalkanAt),
          ),
        ),
      db
        .select({
          id: transferSetoran.id,
          dibuatAt: transferSetoran.dibuatAt,
          dibuatOleh: transferSetoran.dibuatOleh,
          ...batalnya(transferSetoran),
          nominal: transferSetoran.nominal,
          nasabah: nasabah.nama,
        })
        .from(transferSetoran)
        .innerJoin(transaksi, eq(transaksi.id, transferSetoran.transaksiId))
        .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .where(and(eq(transferSetoran.kantorId, kantorId), eq(transaksi.tanggal, tanggal))),
      db
        .select({
          id: serahTerimaKas.id,
          dibuatAt: serahTerimaKas.dibuatAt,
          dibuatOleh: serahTerimaKas.diterimaOleh,
          ...batalnya(serahTerimaKas),
          tunaiDiterima: serahTerimaKas.tunaiDiterima,
          selisih: serahTerimaKas.selisihSetor,
          kolektor: sasaran.nama,
        })
        .from(serahTerimaKas)
        .innerJoin(hariKolektor, eq(hariKolektor.id, serahTerimaKas.hariKolektorId))
        .innerJoin(sasaran, eq(sasaran.id, hariKolektor.kolektorId))
        .where(and(eq(serahTerimaKas.kantorId, kantorId), eq(hariKolektor.tanggal, tanggal))),
      db
        .select({
          id: biayaTakTerduga.id,
          dibuatAt: biayaTakTerduga.dibuatAt,
          dibuatOleh: biayaTakTerduga.dibuatOleh,
          ...batalnya(biayaTakTerduga),
          nominal: biayaTakTerduga.nominal,
          keterangan: biayaTakTerduga.keterangan,
          kolektor: sasaran.nama,
        })
        .from(biayaTakTerduga)
        .innerJoin(sasaran, eq(sasaran.id, biayaTakTerduga.kolektorId))
        .where(and(eq(biayaTakTerduga.kantorId, kantorId), eq(biayaTakTerduga.tanggal, tanggal))),
      bos
        ? db
            .select({
              id: mutasiKasKantor.id,
              dibuatAt: mutasiKasKantor.dibuatAt,
              dibuatOleh: mutasiKasKantor.dibuatOleh,
              ...batalnya(mutasiKasKantor),
              jenis: mutasiKasKantor.jenis,
              nominal: mutasiKasKantor.nominal,
              keterangan: mutasiKasKantor.keterangan,
            })
            .from(mutasiKasKantor)
            .where(
              and(eq(mutasiKasKantor.kantorId, kantorId), eq(mutasiKasKantor.tanggal, tanggal)),
            )
        : Promise.resolve([]),
      db
        .select({
          id: pembayaranGaji.id,
          dibuatAt: pembayaranGaji.dibuatAt,
          dibuatOleh: pembayaranGaji.dibuatOleh,
          ...batalnya(pembayaranGaji),
          gajiBersih: pembayaranGaji.gajiBersih,
          periodeMulai: pembayaranGaji.periodeMulai,
          periodeSelesai: pembayaranGaji.periodeSelesai,
          kolektor: sasaran.nama,
        })
        .from(pembayaranGaji)
        .innerJoin(sasaran, eq(sasaran.id, pembayaranGaji.kolektorId))
        .where(
          and(eq(pembayaranGaji.kantorId, kantorId), eq(pembayaranGaji.tanggalBayar, tanggal)),
        ),
      db
        .select({
          id: penarikanTabungan.id,
          dibuatAt: penarikanTabungan.dibuatAt,
          dibuatOleh: penarikanTabungan.dibuatOleh,
          ...batalnya(penarikanTabungan),
          nominal: penarikanTabungan.nominal,
          alasan: penarikanTabungan.alasanPenarikan,
          nasabah: nasabah.nama,
        })
        .from(penarikanTabungan)
        .innerJoin(nasabah, eq(nasabah.id, penarikanTabungan.nasabahId))
        .where(
          and(eq(penarikanTabungan.kantorId, kantorId), eq(penarikanTabungan.tanggal, tanggal)),
        ),
      db
        .select({
          id: koreksiTabungan.id,
          waktu: koreksiTabungan.dibuatAt,
          pelakuId: koreksiTabungan.dibuatOleh,
          selisih: koreksiTabungan.selisih,
          alasan: koreksiTabungan.alasanKoreksi,
          nasabah: nasabah.nama,
        })
        .from(koreksiTabungan)
        .innerJoin(nasabah, eq(nasabah.id, koreksiTabungan.nasabahId))
        .where(and(eq(koreksiTabungan.kantorId, kantorId), eq(koreksiTabungan.tanggal, tanggal))),
      db
        .select({
          id: pencocokanKas.id,
          dibuatAt: pencocokanKas.dibuatAt,
          dibuatOleh: pencocokanKas.dicocokkanOleh,
          ...batalnya(pencocokanKas),
          akun: pencocokanKas.akun,
          selisih: pencocokanKas.selisih,
          keterangan: pencocokanKas.keterangan,
        })
        .from(pencocokanKas)
        .where(and(eq(pencocokanKas.kantorId, kantorId), eq(pencocokanKas.tanggal, tanggal))),
    ]);
  return {
    akad,
    putih,
    batalSetoran,
    transfer,
    terima,
    biaya,
    mutasi,
    gaji,
    tarik,
    koreksi,
    cocok,
  };
}
