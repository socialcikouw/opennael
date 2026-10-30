import { z } from "zod";
import { nomorHpSchema } from "../identitas/auth";
import { kampungSchema } from "../kantor/wilayah";
import { transaksiSchema } from "./peristiwa";
import { jenisPinjamanSchema, pinjamanSchema } from "./pinjaman";

/**
 * AKAD (aplikasi HP kolektor) — akad pinjaman baru dan gulung.
 * Aturan angka: docs/aturan-usaha.md (A, E).
 */

/** `POST /lapangan/akad` — orang baru atau nasabah lama yang meminjam lagi. */
/** Orang yang belum terdaftar — didaftarkan bersama akad / salinan pertamanya. */
export const nasabahBaruSchema = z.object({
  nama: z.string().trim().min(1).max(50),
  kampung: kampungSchema,
  nik: z
    .string()
    .regex(/^[0-9]{16}$/, "NIK 16 digit")
    .optional(),
  nomorHp: nomorHpSchema.optional(),
});
export type NasabahBaruInput = z.infer<typeof nasabahBaruSchema>;

export const akadSchema = z.object({
  nasabah: z.union([z.object({ nasabahId: z.uuid() }), nasabahBaruSchema]),
  jenis: jenisPinjamanSchema,
  pokok: z.number().int().positive(),
  tenor: z.number().int().positive(),
  /** Foto nasabah memegang uang pencairan — diunggah lebih dulu (`POST /foto`). */
  fotoSerahTerimaId: z.uuid(),
});
export type AkadInput = z.infer<typeof akadSchema>;

/** `POST /lapangan/gulung` — pinjaman lama dilunasi pinjaman baru berjenis sama. */
export const gulungSchema = z.object({
  pinjamanId: z.uuid(),
  pokok: z.number().int().positive(),
  tenor: z.number().int().positive(),
  fotoSerahTerimaId: z.uuid(),
});

export const hasilGulungSchema = z.object({
  transaksi: transaksiSchema,
  pinjamanBaru: pinjamanSchema,
});
