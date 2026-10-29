import type {
  BatalInput,
  BiayaInput,
  HariKas,
  RincianKasJawaban,
  TerimaKasInput,
  TransferInput,
  UbahHariIniInput,
} from "@opennael/contracts";
import { batasTransfer, tekorDanLebih, tunaiSeharusnya } from "@opennael/domain";
import { type AnyColumn, and, asc, eq, gte, isNull, lte, ne, sql } from "drizzle-orm";
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
  batalHanyaHariIni,
  bentrok,
  dilarang,
  kasSudahDiterimaGalat,
  melanggar,
  sudahDibatalkan,
  tidakDitemukan,
} from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { catatRiwayat } from "../../../platform/riwayat";
import { bacaKalender } from "../../kantor";
import { kasSudahDiterima } from "./kunci-hari";

/**
 * SETORAN SORE — kasir menerima kas kolektor dengan hitung buta, mencatat
 * transfer setoran & biaya tak terduga; bos membatalkan (hari yang sama).
 * Sesudah kas diterima hari itu terkunci (aturan-usaha I4) — diperiksa di
 * sini lebih dulu, dijaga trigger `*_terkunci` di database.
 * Lihat docs/skema/schema-serah-terima-kas.md.
 */
export interface SetoranSoreDeps {
  db: Db;
  sekarang?: () => Date;
}

const jumlah = (kolom: AnyColumn) => sql<number>`coalesce(sum(${kolom}), 0)`.mapWith(Number);

/** Kolektor hanya membaca miliknya; bos, kasir, pengawas membaca semua. */
function kolektorYangDibaca(aktor: Aktor, kolektorId: string | undefined): string | undefined {
  if (aktor.peran !== "kolektor") return kolektorId;
  if (kolektorId && kolektorId !== aktor.penggunaId) {
    throw dilarang("BUKAN_MILIK_ANDA", "Anda hanya bisa melihat catatan Anda sendiri");
  }
  return aktor.penggunaId;
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

/** Rincian tunai seharusnya satu hari kolektor (aturan-usaha I1), dari catatan berlaku. */
async function hitungRincian(
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

export function buatLayananSetoranSore(deps: SetoranSoreDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const hariIni = async (aktor: Aktor) =>
    (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal;

  async function namaKolektor(db: Db, aktor: Aktor, kolektorId: string): Promise<string> {
    const [k] = await db
      .select({ nama: pengguna.nama })
      .from(pengguna)
      .where(and(eq(pengguna.id, kolektorId), eq(pengguna.kolektorKantorId, aktor.kantorId)))
      .limit(1);
    if (!k) throw tidakDitemukan("KOLEKTOR_TIDAK_DITEMUKAN", "Kolektor tidak ditemukan");
    return k.nama;
  }

  /** Bentuk jawaban satu hari kolektor — rincian disembunyikan sebelum kas diterima (hitung buta). */
  async function keHariKas(
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

  function bacaHari(db: Db, aktor: Aktor, tanggal: string, kolektorId?: string) {
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
  async function kunciHariMasukKerja(tx: Db, kolektorId: string, tanggal: string) {
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

  async function satuHari(db: Db, aktor: Aktor, kolektorId: string, tanggal: string) {
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
  const keTransfer = (t: {
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
  const pilihTransfer = (db: Db) =>
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
  const keBiaya = (b: {
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
  const pilihBiaya = (db: Db) =>
    db
      .select(kolomBiaya)
      .from(biayaTakTerduga)
      .innerJoin(kolektor, eq(kolektor.id, biayaTakTerduga.kolektorId));

  return {
    // ---- hari kolektor & serah terima kas -----------------------------------

    /** Hari kolektor (semua kolektor kantor, atau satu) pada satu tanggal. */
    async daftarHari(aktor: Aktor, saring: { kolektorId?: string; tanggal?: string }) {
      const kolektorId = kolektorYangDibaca(aktor, saring.kolektorId);
      const tanggal = saring.tanggal ?? (await hariIni(aktor));
      const baris = await bacaHari(deps.db, aktor, tanggal, kolektorId);
      return Promise.all(baris.map((h) => keHariKas(deps.db, aktor, h)));
    },

    /**
     * Terima kas (kasir/bos) — HITUNG BUTA: penerima mengisi uang yang ia
     * hitung; tunai seharusnya dihitung & dibekukan di sini, baru dijawab
     * bersama selisihnya. Baris hari dikunci lebih dulu supaya angka yang
     * dibekukan memuat semua transfer & biaya.
     */
    async terimaKas(aktor: Aktor, kolektorId: string, input: TerimaKasInput) {
      wajibPeran(aktor, "kasir", "bos");
      const tanggal = await hariIni(aktor);
      await namaKolektor(deps.db, aktor, kolektorId);
      return deps.db.transaction(async (tx) => {
        const [h] = await tx
          .select({
            id: hariKolektor.id,
            absensi: hariKolektor.absensi,
            laporanDibukaAt: hariKolektor.laporanDibukaAt,
            kasLapangan: hariKolektor.kasLapangan,
            transferLama: hariKolektor.transferLama,
          })
          .from(hariKolektor)
          .where(and(eq(hariKolektor.kolektorId, kolektorId), eq(hariKolektor.tanggal, tanggal)))
          .for("update");
        if (!h) throw melanggar("BELUM_ABSEN", "Kolektor ini belum absen hari ini");
        if (h.absensi !== "masuk_kerja") {
          throw melanggar("TIDAK_KERJA_HARI_INI", "Kolektor ini tercatat tidak kerja hari ini");
        }
        if (!h.laporanDibukaAt) {
          throw melanggar("LAPORAN_BELUM_DIBUKA", "Kolektor belum membuka laporan hari ini");
        }
        if (await kasSudahDiterima(tx, kolektorId, tanggal)) throw kasSudahDiterimaGalat();
        const rincian = await hitungRincian(tx, { kolektorId, tanggal, ...h });
        await tx.insert(serahTerimaKas).values({
          kantorId: aktor.kantorId,
          hariKolektorId: h.id,
          tunaiSeharusnya: rincian.tunaiSeharusnya,
          tunaiDiterima: input.tunaiDiterima,
          diterimaOleh: aktor.penggunaId,
        });
        return satuHari(tx, aktor, kolektorId, tanggal);
      });
    },

    /** Batal penerimaan kas (bos, hari yang sama) — hari kolektor terbuka lagi. */
    async batalSerahTerima(aktor: Aktor, id: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      const tanggalIni = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const [st] = await tx
          .select({
            dibatalkanAt: serahTerimaKas.dibatalkanAt,
            kolektorId: hariKolektor.kolektorId,
            tanggal: hariKolektor.tanggal,
          })
          .from(serahTerimaKas)
          .innerJoin(hariKolektor, eq(hariKolektor.id, serahTerimaKas.hariKolektorId))
          .where(and(eq(serahTerimaKas.id, id), eq(serahTerimaKas.kantorId, aktor.kantorId)))
          .for("update", { of: serahTerimaKas });
        if (!st)
          throw tidakDitemukan("SERAH_TERIMA_TIDAK_DITEMUKAN", "Serah terima tidak ditemukan");
        if (st.dibatalkanAt) throw sudahDibatalkan();
        if (st.tanggal !== tanggalIni) throw batalHanyaHariIni();
        await tx
          .update(serahTerimaKas)
          .set({
            dibatalkanAt: sekarang(),
            dibatalkanOleh: aktor.penggunaId,
            alasanBatal: input.alasan,
          })
          .where(eq(serahTerimaKas.id, id));
        return satuHari(tx, aktor, st.kolektorId, st.tanggal);
      });
    },

    /** Pembetulan kas lapangan / uang jalan (bos, hari ini, sebelum kas diterima). */
    async ubahHariIni(aktor: Aktor, kolektorId: string, input: UbahHariIniInput) {
      wajibPeran(aktor, "bos");
      const tanggal = await hariIni(aktor);
      await namaKolektor(deps.db, aktor, kolektorId);
      return deps.db.transaction(async (tx) => {
        const h = await kunciHariMasukKerja(tx, kolektorId, tanggal);
        const sebelum: Record<string, number> = {};
        const sesudah: Record<string, number> = {};
        for (const k of ["kasLapangan", "uangJalan"] as const) {
          const baru = input[k];
          if (baru !== undefined && baru !== h[k]) {
            sebelum[k] = h[k];
            sesudah[k] = baru;
          }
        }
        if (Object.keys(sesudah).length === 0) {
          throw melanggar("TIDAK_ADA_PERUBAHAN", "Angkanya sudah sama");
        }
        await tx.update(hariKolektor).set(sesudah).where(eq(hariKolektor.id, h.id));
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "hari_kolektor",
          barisId: h.id,
          aksi: "perbaiki_hari_kolektor",
          sebelum,
          sesudah,
          pelakuId: aktor.penggunaId,
        });
        return satuHari(tx, aktor, kolektorId, tanggal);
      });
    },

    /** Buka kembali hari kolektor yang sudah lapor (bos, hari ini, sebelum kas diterima). */
    async batalLaporan(aktor: Aktor, kolektorId: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      const tanggal = await hariIni(aktor);
      await namaKolektor(deps.db, aktor, kolektorId);
      return deps.db.transaction(async (tx) => {
        const h = await kunciHariMasukKerja(tx, kolektorId, tanggal);
        if (!h.laporanDibukaAt) {
          throw melanggar("LAPORAN_BELUM_DIBUKA", "Kolektor belum membuka laporan hari ini");
        }
        await tx
          .update(hariKolektor)
          .set({ laporanDibukaAt: null })
          .where(eq(hariKolektor.id, h.id));
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "hari_kolektor",
          barisId: h.id,
          aksi: "batal_laporan",
          sebelum: { laporanDibukaAt: h.laporanDibukaAt.toISOString() },
          sesudah: { laporanDibukaAt: null },
          alasan: input.alasan,
          pelakuId: aktor.penggunaId,
        });
        return satuHari(tx, aktor, kolektorId, tanggal);
      });
    },

    // ---- setoran hari itu ----------------------------------------------------

    /** Setoran berlaku satu hari (pilihan transfer di layar kasir), beserta transfernya. */
    async daftarTransaksi(aktor: Aktor, saring: { kolektorId?: string; tanggal?: string }) {
      const kolektorId = kolektorYangDibaca(aktor, saring.kolektorId);
      const tanggal = saring.tanggal ?? (await hariIni(aktor));
      const baris = await deps.db
        .select({
          id: transaksi.id,
          pinjamanId: transaksi.pinjamanId,
          nasabahId: nasabah.id,
          nasabahNama: nasabah.nama,
          jenis: transaksi.jenis,
          setoranMurni: transaksi.setoranMurni,
          setoranPelunasan: transaksi.setoranPelunasan,
          tabunganKeluar: transaksi.tabunganKeluar,
          storting: transaksi.storting,
          transferId: transferSetoran.id,
          transferNominal: transferSetoran.nominal,
        })
        .from(transaksi)
        .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .leftJoin(
          transferSetoran,
          and(eq(transferSetoran.transaksiId, transaksi.id), isNull(transferSetoran.dibatalkanAt)),
        )
        .where(
          and(
            eq(transaksi.kantorId, aktor.kantorId),
            eq(transaksi.tanggal, tanggal),
            isNull(transaksi.dibatalkanAt),
            kolektorId ? eq(transaksi.pencatatId, kolektorId) : undefined,
          ),
        )
        .orderBy(asc(nasabah.nama));
      return baris.map(({ nasabahId, nasabahNama, transferId, transferNominal, ...t }) => ({
        ...t,
        nasabah: { id: nasabahId, nama: nasabahNama },
        batasTransfer: batasTransfer(t),
        transfer:
          transferId && transferNominal !== null
            ? { id: transferId, nominal: transferNominal }
            : null,
      }));
    },

    // ---- transfer setoran ----------------------------------------------------

    async daftarTransfer(aktor: Aktor, saring: { kolektorId?: string; tanggal?: string }) {
      const kolektorId = kolektorYangDibaca(aktor, saring.kolektorId);
      const tanggal = saring.tanggal ?? (await hariIni(aktor));
      const baris = await pilihTransfer(deps.db)
        .where(
          and(
            eq(transferSetoran.kantorId, aktor.kantorId),
            eq(transaksi.tanggal, tanggal),
            kolektorId ? eq(transaksi.pencatatId, kolektorId) : undefined,
          ),
        )
        .orderBy(asc(transferSetoran.dibuatAt));
      const transfer = baris.map(keTransfer);
      const total = baris.filter((t) => !t.dibatalkanAt).reduce((s, t) => s + t.nominal, 0);
      return { transfer, total };
    },

    /** Catat transfer (kasir/bos): setoran hari ini, dalam batas I3, kas belum diterima. */
    async catatTransfer(aktor: Aktor, input: TransferInput) {
      wajibPeran(aktor, "kasir", "bos");
      const tanggalIni = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
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
          throw melanggar(
            "BUKAN_SETORAN_HARI_INI",
            "Transfer hanya dicatat untuk setoran hari ini",
          );
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
    },

    /** Batal transfer (bos): hari yang sama, kas belum diterima. */
    async batalTransfer(aktor: Aktor, id: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      const tanggalIni = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
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
            dibatalkanAt: sekarang(),
            dibatalkanOleh: aktor.penggunaId,
            alasanBatal: input.alasan,
          })
          .where(eq(transferSetoran.id, id));
        const [hasil] = await pilihTransfer(tx).where(eq(transferSetoran.id, id));
        if (!hasil) throw new Error("transfer hilang");
        return keTransfer(hasil);
      });
    },

    // ---- biaya tak terduga ---------------------------------------------------

    async daftarBiaya(
      aktor: Aktor,
      saring: {
        kolektorId?: string;
        tanggalMulai?: string;
        tanggalSelesai?: string;
        termasukBatal?: "ya" | "tidak";
      },
    ) {
      const kolektorId = kolektorYangDibaca(aktor, saring.kolektorId);
      const hari = await hariIni(aktor);
      const baris = await pilihBiaya(deps.db)
        .where(
          and(
            eq(biayaTakTerduga.kantorId, aktor.kantorId),
            gte(biayaTakTerduga.tanggal, saring.tanggalMulai ?? hari),
            lte(biayaTakTerduga.tanggal, saring.tanggalSelesai ?? saring.tanggalMulai ?? hari),
            kolektorId ? eq(biayaTakTerduga.kolektorId, kolektorId) : undefined,
            saring.termasukBatal === "ya" ? undefined : isNull(biayaTakTerduga.dibatalkanAt),
          ),
        )
        .orderBy(asc(biayaTakTerduga.tanggal), asc(biayaTakTerduga.dibuatAt));
      const total = baris.filter((b) => !b.dibatalkanAt).reduce((s, b) => s + b.nominal, 0);
      return { biaya: baris.map(keBiaya), total };
    },

    /** Catat biaya (kasir/bos): hari ini, kolektor masuk kerja, kas belum diterima. */
    async catatBiaya(aktor: Aktor, input: BiayaInput) {
      wajibPeran(aktor, "kasir", "bos");
      const tanggal = await hariIni(aktor);
      await namaKolektor(deps.db, aktor, input.kolektorId);
      return deps.db.transaction(async (tx) => {
        const [h] = await tx
          .select({ absensi: hariKolektor.absensi })
          .from(hariKolektor)
          .where(
            and(eq(hariKolektor.kolektorId, input.kolektorId), eq(hariKolektor.tanggal, tanggal)),
          )
          .limit(1);
        if (!h) throw melanggar("BELUM_ABSEN", "Kolektor ini belum absen hari ini");
        if (h.absensi !== "masuk_kerja") {
          throw melanggar("TIDAK_KERJA_HARI_INI", "Kolektor ini tercatat tidak kerja hari ini");
        }
        if (await kasSudahDiterima(tx, input.kolektorId, tanggal, "share")) {
          throw kasSudahDiterimaGalat();
        }
        const [baru] = await tx
          .insert(biayaTakTerduga)
          .values({
            kantorId: aktor.kantorId,
            kolektorId: input.kolektorId,
            tanggal,
            nominal: input.nominal,
            keterangan: input.keterangan,
            dibuatOleh: aktor.penggunaId,
          })
          .returning({ id: biayaTakTerduga.id });
        if (!baru) throw new Error("biaya tak tersimpan");
        const [hasil] = await pilihBiaya(tx).where(eq(biayaTakTerduga.id, baru.id));
        if (!hasil) throw new Error("biaya hilang");
        return keBiaya(hasil);
      });
    },

    /** Batal biaya (bos): hari yang sama, kas belum diterima. */
    async batalBiaya(aktor: Aktor, id: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      const tanggalIni = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const [b] = await tx
          .select({
            dibatalkanAt: biayaTakTerduga.dibatalkanAt,
            kolektorId: biayaTakTerduga.kolektorId,
            tanggal: biayaTakTerduga.tanggal,
          })
          .from(biayaTakTerduga)
          .where(and(eq(biayaTakTerduga.id, id), eq(biayaTakTerduga.kantorId, aktor.kantorId)))
          .for("update");
        if (!b) throw tidakDitemukan("BIAYA_TIDAK_DITEMUKAN", "Biaya tidak ditemukan");
        if (b.dibatalkanAt) throw sudahDibatalkan();
        if (b.tanggal !== tanggalIni) throw batalHanyaHariIni();
        if (await kasSudahDiterima(tx, b.kolektorId, b.tanggal, "share")) {
          throw kasSudahDiterimaGalat();
        }
        await tx
          .update(biayaTakTerduga)
          .set({
            dibatalkanAt: sekarang(),
            dibatalkanOleh: aktor.penggunaId,
            alasanBatal: input.alasan,
          })
          .where(eq(biayaTakTerduga.id, id));
        const [hasil] = await pilihBiaya(tx).where(eq(biayaTakTerduga.id, id));
        if (!hasil) throw new Error("biaya hilang");
        return keBiaya(hasil);
      });
    },
  };
}

export type LayananSetoranSore = ReturnType<typeof buatLayananSetoranSore>;
