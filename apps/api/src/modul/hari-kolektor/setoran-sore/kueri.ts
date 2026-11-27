import { batasTransfer, selisihHari, tekorDanLebih } from "@opennael/domain";
import { and, asc, between, desc, eq, gte, isNull, lte } from "drizzle-orm";
import {
  biayaTakTerduga,
  hariKolektor,
  nasabah,
  pinjaman,
  serahTerimaKas,
  transaksi,
  transferSetoran,
  wilayah,
} from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { melanggar } from "../../../platform/http/galat";
import { bacaHari, iso, type Konteks, keHariKas, kolektorYangDibaca } from "./data";
import { keBiaya, keTransfer, pilihBiaya, pilihTransfer } from "./transfer-biaya";

/** Riwayat hari paling panjang ±2 bulan (Riwayat Kas HP membaca satu bulan). */
const RIWAYAT_MAKS_HARI = 62;

/** Bacaan SETORAN SORE: hari kolektor, setoran, transfer, dan biaya. */
export function buatKueriSetoranSore(k: Konteks) {
  return {
    // ---- hari kolektor & serah terima kas -----------------------------------

    /** Hari kolektor (semua kolektor kantor, atau satu) pada satu tanggal. */
    async daftarHari(aktor: Aktor, saring: { kolektorId?: string; tanggal?: string }) {
      const kolektorId = kolektorYangDibaca(aktor, saring.kolektorId);
      const tanggal = saring.tanggal ?? (await k.hariIni(aktor));
      const baris = await bacaHari(k.db, aktor, tanggal, kolektorId);
      return Promise.all(baris.map((h) => keHariKas(k.db, aktor, h)));
    },

    /**
     * Riwayat hari satu kolektor dalam rentang ≤ 62 hari, terbaru dulu — ringan (satu kueri):
     * absensi, laporan, dan serah terima berlaku; rincian I1 dibaca per hari.
     */
    async riwayatHari(aktor: Aktor, s: { kolektorId?: string; mulai: string; selesai: string }) {
      const kolektorId = kolektorYangDibaca(aktor, s.kolektorId);
      if (!kolektorId) throw melanggar("KOLEKTOR_WAJIB", "Pilih kolektornya");
      if (s.mulai > s.selesai) {
        throw melanggar("RENTANG_TIDAK_SAH", "Tanggal mulai sesudah tanggal selesai");
      }
      if (selisihHari(s.mulai, s.selesai) >= RIWAYAT_MAKS_HARI) {
        throw melanggar("RENTANG_TERLALU_PANJANG", `Paling panjang ${RIWAYAT_MAKS_HARI} hari`);
      }
      const baris = await k.db
        .select({
          tanggal: hariKolektor.tanggal,
          absensi: hariKolektor.absensi,
          alasanTidakKerja: hariKolektor.alasanTidakKerja,
          kasLapangan: hariKolektor.kasLapangan,
          uangJalan: hariKolektor.uangJalan,
          laporanDibukaAt: hariKolektor.laporanDibukaAt,
          tekorLama: hariKolektor.tekorLama,
          tunaiSeharusnya: serahTerimaKas.tunaiSeharusnya,
          tunaiDiterima: serahTerimaKas.tunaiDiterima,
          selisihSetor: serahTerimaKas.selisihSetor,
        })
        .from(hariKolektor)
        .leftJoin(
          serahTerimaKas,
          and(
            eq(serahTerimaKas.hariKolektorId, hariKolektor.id),
            isNull(serahTerimaKas.dibatalkanAt),
          ),
        )
        .where(
          and(
            eq(hariKolektor.kantorId, aktor.kantorId),
            eq(hariKolektor.kolektorId, kolektorId),
            between(hariKolektor.tanggal, s.mulai, s.selesai),
          ),
        )
        .orderBy(desc(hariKolektor.tanggal));
      return baris.map(({ tunaiSeharusnya, tunaiDiterima, selisihSetor, ...h }) => ({
        ...h,
        laporanDibukaAt: iso(h.laporanDibukaAt),
        tekorLama: h.tekorLama ?? 0,
        serahTerima:
          tunaiSeharusnya !== null && tunaiDiterima !== null && selisihSetor !== null
            ? { tunaiSeharusnya, tunaiDiterima, selisihSetor, ...tekorDanLebih(selisihSetor) }
            : null,
      }));
    },

    // ---- setoran hari itu ----------------------------------------------------

    /** Setoran berlaku satu hari (pilihan transfer di layar kasir), beserta transfernya. */
    async daftarTransaksi(aktor: Aktor, saring: { kolektorId?: string; tanggal?: string }) {
      const kolektorId = kolektorYangDibaca(aktor, saring.kolektorId);
      const tanggal = saring.tanggal ?? (await k.hariIni(aktor));
      const baris = await k.db
        .select({
          id: transaksi.id,
          pinjamanId: transaksi.pinjamanId,
          nasabahId: nasabah.id,
          nasabahNama: nasabah.nama,
          kampung: wilayah.nama,
          jenisPinjaman: pinjaman.jenis,
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
        .innerJoin(wilayah, eq(wilayah.id, nasabah.wilayahId))
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
      const tanggal = saring.tanggal ?? (await k.hariIni(aktor));
      const baris = await pilihTransfer(k.db)
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
      const hari = await k.hariIni(aktor);
      const baris = await pilihBiaya(k.db)
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
  };
}
