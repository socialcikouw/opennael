import type { JenisPinjaman } from "@opennael/domain";
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

/**
 * Angka satu rentang untuk kantor atau satu kolektor. `jenis` menyaring penagihan & akad
 * ke satu jenis pinjaman (kas lapangan tak berjenis, jadi tak ikut tersaring).
 */
export async function angka(
  k: Konteks,
  aktor: Aktor,
  mulai: string,
  selesai: string,
  kolektorId?: string,
  jenis?: JenisPinjaman,
) {
  const db = k.db;
  // Transaksi tak menyimpan jenis pinjaman: saringan jenis lewat pinjamannya.
  const transaksiJenis = jenis
    ? sql`exists (select 1 from ${pinjaman} where ${pinjaman.id} = ${transaksi.pinjamanId} and ${pinjaman.jenis} = ${jenis})`
    : undefined;
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
        transaksiJenis,
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
        jenis ? eq(pinjaman.jenis, jenis) : undefined,
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
    .select({
      transfer: jumlah(transferSetoran.nominal),
      transferJenis: jumlah(
        jenis
          ? sql`case when ${transaksiJenis} then ${transferSetoran.nominal} end`
          : transferSetoran.nominal,
      ),
    })
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
  const { transferJenis, ...sisaTransfer } = transfer;
  return {
    penagihan: { ...setoran, transfer: transferJenis },
    akad,
    kasLapangan: {
      hariKerja: hari.hariKerja,
      kasLapangan: hari.kasLapangan,
      uangJalan: hari.uangJalan,
      transfer: hari.transferLama + sisaTransfer.transfer,
      biayaTakTerduga: biaya.biaya,
      tunaiDiterima: serah.tunaiDiterima,
      tekor: hari.tekorLama + serah.tekor,
      lebihSetor: serah.lebihSetor,
    },
  };
}

const URUTAN_JENIS: readonly JenisPinjaman[] = ["harian", "mingguan", "tempoan"];

/** Storting & droping per jenis pinjaman satu rentang — komposisi per jenis di HP. */
export async function angkaPerJenis(
  k: Konteks,
  aktor: Aktor,
  mulai: string,
  selesai: string,
  kolektorId?: string,
) {
  const setoran = await k.db
    .select({
      jenis: pinjaman.jenis,
      jumlahSetoran: banyak(),
      storting: jumlah(transaksi.storting),
    })
    .from(transaksi)
    .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
    .where(
      and(
        eq(transaksi.kantorId, aktor.kantorId),
        between(transaksi.tanggal, mulai, selesai),
        isNull(transaksi.dibatalkanAt),
        kolektorId ? eq(transaksi.pencatatId, kolektorId) : undefined,
      ),
    )
    .groupBy(pinjaman.jenis);
  const akad = await k.db
    .select({ jenis: pinjaman.jenis, jumlahAkad: banyak(), droping: jumlah(pinjaman.droping) })
    .from(pinjaman)
    .where(
      and(
        eq(pinjaman.kantorId, aktor.kantorId),
        between(pinjaman.tanggalAkad, mulai, selesai),
        isNull(pinjaman.dibatalkanAt),
        ne(pinjaman.asal, "migrasi"),
        kolektorId ? eq(pinjaman.pencairId, kolektorId) : undefined,
      ),
    )
    .groupBy(pinjaman.jenis);
  return URUTAN_JENIS.map((jenis) => {
    const s = setoran.find((x) => x.jenis === jenis);
    const a = akad.find((x) => x.jenis === jenis);
    return {
      jenis,
      jumlahSetoran: s?.jumlahSetoran ?? 0,
      storting: s?.storting ?? 0,
      jumlahAkad: a?.jumlahAkad ?? 0,
      droping: a?.droping ?? 0,
    };
  });
}
