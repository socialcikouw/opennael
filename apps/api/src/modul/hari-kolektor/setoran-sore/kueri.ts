import { batasTransfer } from "@opennael/domain";
import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import {
  biayaTakTerduga,
  nasabah,
  pinjaman,
  transaksi,
  transferSetoran,
  wilayah,
} from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { bacaHari, type Konteks, keHariKas, kolektorYangDibaca } from "./data";
import { keBiaya, keTransfer, pilihBiaya, pilihTransfer } from "./transfer-biaya";

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
