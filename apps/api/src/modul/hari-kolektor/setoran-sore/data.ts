import type { HariKas, RincianKasJawaban } from "@opennael/contracts";
import { tekorDanLebih, tunaiSeharusnya } from "@opennael/domain";
import { type AnyColumn, and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../../../platform/db/klien";
import {
  biayaTakTerduga,
  hariKolektor,
  nasabah,
  pengguna,
  pinjaman,
  serahTerimaKas,
  transaksi,
  transferSetoran,
} from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import {
  dilarang,
  kasSudahDiterimaGalat,
  melanggar,
  tidakDitemukan,
} from "../../../platform/http/galat";
import { kasSudahDiterima } from "./kunci-hari";

/**
 * Pembantu privat SETORAN SORE: pemeta baris, kueri bersama, dan rincian tunai
 * seharusnya (aturan-usaha I1). Dipakai `kueri.ts` dan `operasi/*.ts`.
 */

/** Yang dibutuhkan semua kueri & operasi satu layanan: database, jam, dan "hari ini" kantor aktor. */
export interface Konteks {
  db: Db;
  sekarang: () => Date;
  hariIni: (aktor: Aktor) => Promise<string>;
}

const jumlah = (kolom: AnyColumn) => sql<number>`coalesce(sum(${kolom}), 0)`.mapWith(Number);

/** Kolektor hanya membaca miliknya; bos, kasir, pengawas membaca semua. */
export function kolektorYangDibaca(
  aktor: Aktor,
  kolektorId: string | undefined,
): string | undefined {
  if (aktor.peran !== "kolektor") return kolektorId;
  if (kolektorId && kolektorId !== aktor.penggunaId) {
    throw dilarang("BUKAN_MILIK_ANDA", "Anda hanya bisa melihat catatan Anda sendiri");
  }
  return aktor.penggunaId;
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

/** Rincian tunai seharusnya satu hari kolektor (aturan-usaha I1), dari catatan berlaku. */
export async function hitungRincian(
  db: Db,
  hari: { kolektorId: string; tanggal: string; kasLapangan: number; transferLama: number | null },
): Promise<RincianKasJawaban> {
  const [setoran] = await db
    .select({ storting: jumlah(transaksi.storting) })
    .from(transaksi)
    .where(
      and(
        eq(transaksi.pencatatId, hari.kolektorId),
        eq(transaksi.tanggal, hari.tanggal),
        isNull(transaksi.dibatalkanAt),
      ),
    );
  // Salinan migrasi bukan uang yang keluar hari itu.
  const [akad] = await db
    .select({
      tabunganMasuk: jumlah(pinjaman.tabunganMasuk),
      potonganAdmin: jumlah(pinjaman.potonganAdmin),
      droping: jumlah(pinjaman.droping),
    })
    .from(pinjaman)
    .where(
      and(
        eq(pinjaman.pencairId, hari.kolektorId),
        eq(pinjaman.tanggalAkad, hari.tanggal),
        isNull(pinjaman.dibatalkanAt),
        ne(pinjaman.asal, "migrasi"),
      ),
    );
  const [tf] = await db
    .select({ transfer: jumlah(transferSetoran.nominal) })
    .from(transferSetoran)
    .innerJoin(transaksi, eq(transaksi.id, transferSetoran.transaksiId))
    .where(
      and(
        eq(transaksi.pencatatId, hari.kolektorId),
        eq(transaksi.tanggal, hari.tanggal),
        isNull(transaksi.dibatalkanAt),
        isNull(transferSetoran.dibatalkanAt),
      ),
    );
  const [b] = await db
    .select({ biaya: jumlah(biayaTakTerduga.nominal) })
    .from(biayaTakTerduga)
    .where(
      and(
        eq(biayaTakTerduga.kolektorId, hari.kolektorId),
        eq(biayaTakTerduga.tanggal, hari.tanggal),
        isNull(biayaTakTerduga.dibatalkanAt),
      ),
    );
  const rincian = {
    kasLapangan: hari.kasLapangan,
    storting: setoran?.storting ?? 0,
    tabunganMasuk: akad?.tabunganMasuk ?? 0,
    potonganAdmin: akad?.potonganAdmin ?? 0,
    droping: akad?.droping ?? 0,
    transfer: (hari.transferLama ?? 0) + (tf?.transfer ?? 0),
    biaya: b?.biaya ?? 0,
  };
  return { ...rincian, tunaiSeharusnya: tunaiSeharusnya(rincian) };
}

const kolektor = alias(pengguna, "kolektor");
const penerima = alias(pengguna, "penerima");

const kolomHari = {
  id: hariKolektor.id,
  kolektorId: hariKolektor.kolektorId,
  kolektorNama: kolektor.nama,
  tanggal: hariKolektor.tanggal,
  absensi: hariKolektor.absensi,
  alasanTidakKerja: hariKolektor.alasanTidakKerja,
  kasLapangan: hariKolektor.kasLapangan,
  uangJalan: hariKolektor.uangJalan,
  laporanDibukaAt: hariKolektor.laporanDibukaAt,
  transferLama: hariKolektor.transferLama,
};

export async function namaKolektor(db: Db, aktor: Aktor, kolektorId: string): Promise<string> {
  const [k] = await db
    .select({ nama: pengguna.nama })
    .from(pengguna)
    .where(and(eq(pengguna.id, kolektorId), eq(pengguna.kolektorKantorId, aktor.kantorId)))
    .limit(1);
  if (!k) throw tidakDitemukan("KOLEKTOR_TIDAK_DITEMUKAN", "Kolektor tidak ditemukan");
  return k.nama;
}

/** Bentuk jawaban satu hari kolektor — rincian disembunyikan sebelum kas diterima (hitung buta). */
export async function keHariKas(
  db: Db,
  aktor: Aktor,
  h: Awaited<ReturnType<typeof bacaHari>>[number],
): Promise<HariKas> {
  const [st] = await db
    .select({
      id: serahTerimaKas.id,
      tunaiSeharusnya: serahTerimaKas.tunaiSeharusnya,
      tunaiDiterima: serahTerimaKas.tunaiDiterima,
      selisihSetor: serahTerimaKas.selisihSetor,
      penerimaId: penerima.id,
      penerimaNama: penerima.nama,
      dibuatAt: serahTerimaKas.dibuatAt,
    })
    .from(serahTerimaKas)
    .innerJoin(penerima, eq(penerima.id, serahTerimaKas.diterimaOleh))
    .where(and(eq(serahTerimaKas.hariKolektorId, h.id), isNull(serahTerimaKas.dibatalkanAt)))
    .limit(1);
  const bolehLihat = Boolean(st) || aktor.penggunaId === h.kolektorId;
  const rincian = h.absensi === "masuk_kerja" && bolehLihat ? await hitungRincian(db, h) : null;
  return {
    id: h.id,
    kolektor: { id: h.kolektorId, nama: h.kolektorNama },
    tanggal: h.tanggal,
    absensi: h.absensi,
    alasanTidakKerja: h.alasanTidakKerja,
    kasLapangan: h.kasLapangan,
    uangJalan: h.uangJalan,
    laporanDibukaAt: iso(h.laporanDibukaAt),
    rincian,
    serahTerima: st
      ? {
          id: st.id,
          tunaiSeharusnya: st.tunaiSeharusnya,
          tunaiDiterima: st.tunaiDiterima,
          selisihSetor: st.selisihSetor,
          ...tekorDanLebih(st.selisihSetor),
          diterimaOleh: { id: st.penerimaId, nama: st.penerimaNama },
          dibuatAt: st.dibuatAt.toISOString(),
        }
      : null,
  };
}

export function bacaHari(db: Db, aktor: Aktor, tanggal: string, kolektorId?: string) {
  return db
    .select(kolomHari)
    .from(hariKolektor)
    .innerJoin(kolektor, eq(kolektor.id, hariKolektor.kolektorId))
    .where(
      and(
        eq(hariKolektor.kantorId, aktor.kantorId),
        eq(hariKolektor.tanggal, tanggal),
        kolektorId ? eq(hariKolektor.kolektorId, kolektorId) : undefined,
      ),
    )
    .orderBy(asc(kolektor.nama));
}

/** Kunci hari kolektor hari ini untuk pembetulan bos: masuk kerja & kas belum diterima. */
export async function kunciHariMasukKerja(tx: Db, kolektorId: string, tanggal: string) {
  const [h] = await tx
    .select({
      id: hariKolektor.id,
      absensi: hariKolektor.absensi,
      kasLapangan: hariKolektor.kasLapangan,
      uangJalan: hariKolektor.uangJalan,
      laporanDibukaAt: hariKolektor.laporanDibukaAt,
    })
    .from(hariKolektor)
    .where(and(eq(hariKolektor.kolektorId, kolektorId), eq(hariKolektor.tanggal, tanggal)))
    .for("update");
  if (!h) throw melanggar("BELUM_ABSEN", "Kolektor ini belum absen hari ini");
  if (h.absensi !== "masuk_kerja") {
    throw melanggar("TIDAK_KERJA_HARI_INI", "Kolektor ini tercatat tidak kerja hari ini");
  }
  if (await kasSudahDiterima(tx, kolektorId, tanggal)) throw kasSudahDiterimaGalat();
  return h;
}

export async function satuHari(db: Db, aktor: Aktor, kolektorId: string, tanggal: string) {
  const [h] = await bacaHari(db, aktor, tanggal, kolektorId);
  if (!h) throw new Error("hari kolektor hilang");
  return keHariKas(db, aktor, h);
}

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
