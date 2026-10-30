import { z } from "zod";
import { orang } from "../bersama/dasar";
import { peranSchema } from "../identitas/auth";

/**
 * AKTIVITAS (web bos; pengawas membaca) — siapa melakukan apa pada satu
 * tanggal kantor: jejak `riwayat_perubahan` digabung dengan pencatatan dan
 * pembatalan di tabel uang. Lihat docs/skema/schema-riwayat-perubahan.md.
 */

/** Tanpa `tanggal` = hari ini (kalender kantor). */
export const saringAktivitasSchema = z.object({
  tanggal: z.iso.date().optional(),
  pelakuId: z.uuid().optional(),
});

export const aktivitasSchema = z.object({
  waktu: z.iso.datetime(),
  pelaku: orang,
  peran: peranSchema,
  /**
   * Kode kejadian untuk ikon & saringan di layar: kejadian uang (`akad`, `salin_pinjaman`,
   * `batal_akad`, `pemutihan`, `batal_setoran`, `transfer_setoran`,
   * `terima_kas`, `biaya_tak_terduga`, `mutasi_kas`, `bayar_gaji`,
   * `tarik_tabungan`, `koreksi_tabungan`, `cocokkan_kas`, dan `batal_<…>`
   * pasangannya) atau `aksi` dari riwayat perubahan.
   */
  kejadian: z.string(),
  ringkasan: z.string(),
  /** Rupiah utama kejadian (koreksi & selisih bertanda); null bila bukan kejadian uang. */
  nominal: z.number().nullable(),
  alasan: z.string().nullable(),
  /** Baris sumber — `tabel` + `id`; untuk riwayat dibuka lewat `GET /riwayat`. */
  rujukan: z.object({ tabel: z.string(), id: z.uuid() }),
});

/** Tabel yang barisnya berjejak di `riwayat_perubahan` (sama dengan enum `tabel_berjejak`). */
export const tabelBerjejakSchema = z.enum([
  "kantor",
  "pekan_kerja",
  "buku_kas",
  "kebijakan",
  "pengguna",
  "wilayah",
  "nasabah",
  "pinjaman",
  "hari_kolektor",
  "libur_nasabah",
  "libur_kantor",
  "tarif_gaji",
  "rute_kolektor",
  "transaksi",
  "biaya_tak_terduga",
  "kebijakan_kantor",
  "kebijakan_kolektor",
  "perangkat",
]);

export const saringRiwayatSchema = z.object({
  tabel: tabelBerjejakSchema,
  barisId: z.uuid(),
});

/** `GET /riwayat` — jejak satu baris, terbaru dulu. */
export const jejakRiwayatSchema = z.object({
  waktu: z.iso.datetime(),
  pelaku: orang,
  peran: peranSchema,
  aksi: z.string(),
  /** Hanya kolom yang berubah. */
  sebelum: z.record(z.string(), z.unknown()).nullable(),
  sesudah: z.record(z.string(), z.unknown()).nullable(),
  alasan: z.string().nullable(),
});

export type Aktivitas = z.infer<typeof aktivitasSchema>;
export type TabelBerjejak = z.infer<typeof tabelBerjejakSchema>;
export type JejakRiwayat = z.infer<typeof jejakRiwayatSchema>;
