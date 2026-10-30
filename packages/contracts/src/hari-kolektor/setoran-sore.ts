import { z } from "zod";
import { orang, tanggal } from "../bersama/dasar";

/**
 * SETORAN SORE — kasir menerima kas kolektor (hitung buta), mencatat transfer
 * setoran & biaya tak terduga; bos membatalkan. Aturan angka:
 * docs/aturan-usaha.md bagian I; tabel: docs/skema/schema-serah-terima-kas.md,
 * schema-transfer-setoran.md, schema-biaya-tak-terduga.md.
 */

/** `POST .../batal` — semua pembatalan uang oleh bos, hari yang sama (L1). */
export const batalSchema = z.object({ alasan: z.string().trim().min(1).max(100) });
export type BatalInput = z.infer<typeof batalSchema>;

/** Penyaring daftar per kolektor per hari; tanpa tanggal = hari ini (kalender kantor). */
export const saringHariSchema = z.object({
  kolektorId: z.uuid().optional(),
  tanggal: tanggal.optional(),
});

// ---- hari kolektor & serah terima kas ----------------------------------------

/** Penyusun tunai seharusnya (aturan-usaha I1). */
export const rincianKasSchema = z.object({
  kasLapangan: z.number(),
  storting: z.number(),
  tabunganMasuk: z.number(),
  potonganAdmin: z.number(),
  droping: z.number(),
  transfer: z.number(),
  biaya: z.number(),
  tunaiSeharusnya: z.number(),
});
export type RincianKasJawaban = z.infer<typeof rincianKasSchema>;

export const serahTerimaSchema = z.object({
  id: z.uuid(),
  /** Dibekukan saat diterima. */
  tunaiSeharusnya: z.number(),
  tunaiDiterima: z.number(),
  /** Minus = tekor; plus = lebih setor. */
  selisihSetor: z.number(),
  tekor: z.number(),
  lebihSetor: z.number(),
  diterimaOleh: orang,
  dibuatAt: z.string(),
});

/**
 * Satu kolektor pada satu hari, dilihat dari kantor. HITUNG BUTA: sebelum kas
 * diterima, `rincian` hanya terisi untuk kolektor itu sendiri — kasir, bos,
 * dan pengawas melihatnya sesudah menyimpan uang yang diterima.
 */
export const hariKasSchema = z.object({
  id: z.uuid(),
  kolektor: orang,
  tanggal: z.string(),
  absensi: z.enum(["masuk_kerja", "tidak_kerja"]),
  alasanTidakKerja: z.string().nullable(),
  kasLapangan: z.number(),
  uangJalan: z.number(),
  laporanDibukaAt: z.string().nullable(),
  rincian: rincianKasSchema.nullable(),
  /** Serah terima berlaku (null = kas belum diterima). */
  serahTerima: serahTerimaSchema.nullable(),
});
export type HariKas = z.infer<typeof hariKasSchema>;

/** `POST /hari-kolektor/:kolektorId/terima-kas` — uang fisik yang dihitung kasir. */
export const terimaKasSchema = z.object({ tunaiDiterima: z.number().int().min(0) });
export type TerimaKasInput = z.infer<typeof terimaKasSchema>;

/** `PATCH /hari-kolektor/:kolektorId/hari-ini` — pembetulan angka pagi oleh bos. */
export const ubahHariIniSchema = z
  .object({
    kasLapangan: z.number().int().min(0).optional(),
    uangJalan: z.number().int().min(0).optional(),
  })
  .refine((v) => v.kasLapangan !== undefined || v.uangJalan !== undefined, {
    message: "Isi kas lapangan atau uang jalan",
  });
export type UbahHariIniInput = z.infer<typeof ubahHariIniSchema>;

// ---- setoran hari itu (pilihan transfer) -------------------------------------

export const transaksiHariSchema = z.object({
  id: z.uuid(),
  pinjamanId: z.uuid(),
  nasabah: orang,
  jenis: z.enum(["angsuran", "pelunasan", "gulung"]),
  setoranMurni: z.number(),
  setoranPelunasan: z.number(),
  tabunganKeluar: z.number(),
  storting: z.number(),
  /** Paling banyak yang boleh dicatat transfer (I3); 0 = tidak bisa ditransfer. */
  batasTransfer: z.number(),
  /** Transfer berlaku yang menempel pada setoran ini. */
  transfer: z.object({ id: z.uuid(), nominal: z.number() }).nullable(),
});

// ---- transfer setoran --------------------------------------------------------

export const transferInputSchema = z.object({
  transaksiId: z.uuid(),
  nominal: z.number().int().positive(),
});
export type TransferInput = z.infer<typeof transferInputSchema>;

export const transferSchema = z.object({
  id: z.uuid(),
  transaksiId: z.uuid(),
  nasabah: orang,
  jenis: z.enum(["angsuran", "pelunasan", "gulung"]),
  nominal: z.number(),
  dibuatAt: z.string(),
  dibatalkanAt: z.string().nullable(),
  alasanBatal: z.string().nullable(),
});

export const daftarTransferSchema = z.object({
  transfer: z.array(transferSchema),
  /** Σ transfer berlaku. */
  total: z.number(),
});

// ---- biaya tak terduga -------------------------------------------------------

export const biayaInputSchema = z.object({
  kolektorId: z.uuid(),
  nominal: z.number().int().positive(),
  keterangan: z.string().trim().min(1).max(100),
});
export type BiayaInput = z.infer<typeof biayaInputSchema>;

export const saringBiayaSchema = z.object({
  kolektorId: z.uuid().optional(),
  tanggalMulai: tanggal.optional(),
  tanggalSelesai: tanggal.optional(),
  termasukBatal: z.enum(["ya", "tidak"]).optional(),
});

export const biayaSchema = z.object({
  id: z.uuid(),
  kolektor: orang,
  tanggal: z.string(),
  nominal: z.number(),
  keterangan: z.string(),
  dibuatAt: z.string(),
  dibatalkanAt: z.string().nullable(),
  alasanBatal: z.string().nullable(),
});

export const daftarBiayaSchema = z.object({
  biaya: z.array(biayaSchema),
  /** Σ biaya berlaku. */
  total: z.number(),
});
