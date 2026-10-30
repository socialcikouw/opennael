import { z } from "zod";
import { orang } from "../bersama/dasar";
import { nomorHpSchema } from "../identitas/auth";
import { kampungSchema } from "../kantor/wilayah";
import { jenisPinjamanSchema } from "./pinjaman";

/** `GET /lapangan/nasabah-lama` — pegangan tanpa pinjaman aktif, siap pinjam lagi. */
export const nasabahLamaSchema = z.object({
  id: z.uuid(),
  nama: z.string(),
  kampung: z.string(),
  tabungan: z.number(),
  terakhir: z
    .object({ pinjamanKe: z.number(), jenis: jenisPinjamanSchema, pokok: z.number() })
    .nullable(),
});
export type NasabahLama = z.infer<typeof nasabahLamaSchema>;

/**
 * KELOLA NASABAH — daftar & cari, sunting identitas (bos), pindah pemegang
 * (bos), titik rumah (bos / kolektor pemegang). Docs: schema-nasabah.md.
 */

/** `GET /nasabah` — kolektor: pegangannya; kasir: nama & kampung saja. */
export const saringNasabahSchema = z.object({
  cari: z.string().trim().min(1).max(50).optional(),
  kolektorId: z.uuid().optional(),
  /** `ya` = boleh meminjam lagi: tanpa pinjaman aktif & tak diblokir. */
  bebas: z.enum(["ya"]).optional(),
});

export const lokasiRumahSchema = z.object({
  latitude: z.number().min(-11).max(6),
  longitude: z.number().min(95).max(141),
  akurasiMeter: z.number().int().positive().max(32_767),
});
export type LokasiRumahInput = z.infer<typeof lokasiRumahSchema>;

/**
 * Satu nasabah. Kolom yang tak boleh dilihat peran pembaca bernilai null:
 * kasir hanya nama & kampung; NIK tersamar selain untuk bos.
 */
export const nasabahSchema = z.object({
  id: z.uuid(),
  nama: z.string(),
  kampung: orang,
  kolektor: orang.nullable(),
  nomorHp: z.string().nullable(),
  nik: z.string().nullable(),
  saldoTabungan: z.number().nullable(),
  diblokir: z.boolean().nullable(),
  pinjamanAktif: z
    .object({ id: z.uuid(), status: z.enum(["berjalan", "macet"]), saldo: z.number() })
    .nullable(),
  lokasi: lokasiRumahSchema.nullable(),
});
export type NasabahJawaban = z.infer<typeof nasabahSchema>;

/** `PATCH /nasabah/:id` — identitas; `null` menghapus nomor HP / NIK. */
export const ubahNasabahSchema = z
  .object({
    nama: z.string().trim().min(1).max(50).optional(),
    kampung: kampungSchema.optional(),
    nomorHp: nomorHpSchema.nullable().optional(),
    nik: z
      .string()
      .regex(/^[0-9]{16}$/, "NIK 16 digit")
      .nullable()
      .optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Isi paling sedikit satu kolom");
export type UbahNasabahInput = z.infer<typeof ubahNasabahSchema>;

/** `POST /nasabah/:id/pindah` — pindah pemegang. */
export const pindahPemegangSchema = z.object({ kolektorId: z.uuid() });

/** `GET /nasabah/serupa` — "mungkin nasabah lama?" sebelum akad (bos, kolektor). */
export const saringNasabahSerupaSchema = z.object({
  nama: z.string().trim().min(2).max(50),
  kampung: z.string().trim().min(1).max(50).optional(),
  nik: z
    .string()
    .regex(/^[0-9]{16}$/)
    .optional(),
});

export const nasabahSerupaSchema = z.object({
  id: z.uuid(),
  nama: z.string(),
  kampung: z.string(),
  kolektor: orang,
  /** Alasan muncul: NIK sama, atau nama mirip (di kampung yang sama bila disebut). */
  cocok: z.enum(["nik", "nama"]),
  diblokir: z.boolean(),
  punyaPinjamanAktif: z.boolean(),
});

/** `GET /nasabah/:id/neraca` — bahan menimbang pemutihan (bos, pengawas). */
export const neracaNasabahSchema = z.object({
  nasabah: orang,
  jumlahPinjaman: z.number(),
  /** Σ uang yang diterima nasabah saat akad (gulung: pencairan bersihnya). */
  totalPencairan: z.number(),
  /** Σ tabungan yang diserahkan tunai: penarikan + sisa tabungan saat lunas (D2). */
  tabunganDikembalikan: z.number(),
  /** Σ uang dari kantong nasabah: setoran murni + uang lebih pada angsuran. */
  totalSetoran: z.number(),
  /** totalSetoran − totalPencairan − tabunganDikembalikan: plus = kantor sudah balik modal. */
  arusKas: z.number(),
  tabungan: z.number(),
  piutangAktif: z.number(),
  piutangDiputihkan: z.number(),
  /** tabungan − piutang aktif: minus = utang bersih nasabah. */
  neraca: z.number(),
});
