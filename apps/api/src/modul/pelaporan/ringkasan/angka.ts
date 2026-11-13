import { and, between, eq, isNull, ne, sql } from "drizzle-orm";
import {
  biayaTakTerduga,
  hariKolektor,
  pinjaman,
  serahTerimaKas,
  transaksi,
  transferSetoran,
} from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { banyak, jumlah, type Konteks } from "./data";

/** Angka satu rentang untuk kantor atau satu kolektor. */
export async function angka(
  k: Konteks,
  aktor: Aktor,
  mulai: string,
  selesai: string,
  kolektorId?: string,
) {
  const db = k.db;
  const [setoran] = await db
    .select({
      jumlahSetoran: banyak(),
      setoranMurni: jumlah(transaksi.setoranMurni),
      setoranPelunasan: jumlah(transaksi.setoranPelunasan),
      tabunganKeluar: jumlah(transaksi.tabunganKeluar),
      storting: jumlah(transaksi.storting),
    })
    .from(transaksi)
    .where(
      and(
        eq(transaksi.kantorId, aktor.kantorId),
        between(transaksi.tanggal, mulai, selesai),
        isNull(transaksi.dibatalkanAt),
        kolektorId ? eq(transaksi.pencatatId, kolektorId) : undefined,
      ),
    );
  const [akad] = await db
    .select({
      jumlahAkad: banyak(),
      droping: jumlah(pinjaman.droping),
      dropBaru: jumlah(pinjaman.dropBaru),
      dropGulung: jumlah(pinjaman.dropGulung),
      pokokBerkurang: jumlah(pinjaman.pokokBerkurang),
      potonganAdmin: jumlah(pinjaman.potonganAdmin),
      tabunganMasuk: jumlah(pinjaman.tabunganMasuk),
      pencairan: jumlah(pinjaman.pencairan),
    })
    .from(pinjaman)
    .where(
      and(
        eq(pinjaman.kantorId, aktor.kantorId),
        between(pinjaman.tanggalAkad, mulai, selesai),
        isNull(pinjaman.dibatalkanAt),
        ne(pinjaman.asal, "migrasi"),
        kolektorId ? eq(pinjaman.pencairId, kolektorId) : undefined,
      ),
    );
  const hariSaring = and(
    eq(hariKolektor.kantorId, aktor.kantorId),
    between(hariKolektor.tanggal, mulai, selesai),
    kolektorId ? eq(hariKolektor.kolektorId, kolektorId) : undefined,
  );
  const [hari] = await db
    .select({
      hariKerja:
        sql<number>`count(*) filter (where ${hariKolektor.absensi} = 'masuk_kerja')`.mapWith(
          Number,
        ),
      kasLapangan: jumlah(hariKolektor.kasLapangan),
      uangJalan: jumlah(hariKolektor.uangJalan),
      transferLama: jumlah(hariKolektor.transferLama),
      tekorLama: jumlah(hariKolektor.tekorLama),
    })
    .from(hariKolektor)
    .where(hariSaring);
  const [serah] = await db
    .select({
      tunaiDiterima: jumlah(serahTerimaKas.tunaiDiterima),
      tekor: jumlah(sql`greatest(-${serahTerimaKas.selisihSetor}, 0)`),
      lebihSetor: jumlah(sql`greatest(${serahTerimaKas.selisihSetor}, 0)`),
    })
    .from(serahTerimaKas)
    .innerJoin(hariKolektor, eq(hariKolektor.id, serahTerimaKas.hariKolektorId))
    .where(and(hariSaring, isNull(serahTerimaKas.dibatalkanAt)));
  const [transfer] = await db
    .select({ transfer: jumlah(transferSetoran.nominal) })
    .from(transferSetoran)
    .innerJoin(transaksi, eq(transaksi.id, transferSetoran.transaksiId))
    .where(
      and(
        eq(transferSetoran.kantorId, aktor.kantorId),
        isNull(transferSetoran.dibatalkanAt),
        isNull(transaksi.dibatalkanAt),
        between(transaksi.tanggal, mulai, selesai),
        kolektorId ? eq(transaksi.pencatatId, kolektorId) : undefined,
      ),
    );
  const [biaya] = await db
    .select({ biaya: jumlah(biayaTakTerduga.nominal) })
    .from(biayaTakTerduga)
    .where(
      and(
        eq(biayaTakTerduga.kantorId, aktor.kantorId),
        between(biayaTakTerduga.tanggal, mulai, selesai),
        isNull(biayaTakTerduga.dibatalkanAt),
        kolektorId ? eq(biayaTakTerduga.kolektorId, kolektorId) : undefined,
      ),
    );
  if (!setoran || !akad || !hari || !serah || !transfer || !biaya)
    throw new Error("agregat kosong");
  return {
    penagihan: setoran,
    akad,
    kasLapangan: {
      hariKerja: hari.hariKerja,
      kasLapangan: hari.kasLapangan,
      uangJalan: hari.uangJalan,
      transfer: hari.transferLama + transfer.transfer,
      biayaTakTerduga: biaya.biaya,
      tunaiDiterima: serah.tunaiDiterima,
      tekor: hari.tekorLama + serah.tekor,
      lebihSetor: serah.lebihSetor,
    },
  };
}
