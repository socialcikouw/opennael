import { z } from "zod";
import { nomorHpSchema, peranSchema } from "./auth";

/**
 * KELOLA KARYAWAN (web bos) — daftar, sunting, nonaktifkan, aktifkan. Akun
 * baru lewat tautan QR (`/auth/tautan`). Docs: schema-pengguna.md.
 */

/** `GET /pengguna` — kasir & pengawas hanya mendapat daftar kolektor. */
export const saringPenggunaSchema = z.object({
  peran: peranSchema.optional(),
  termasukNonaktif: z.enum(["ya", "tidak"]).optional(),
});

export const penggunaSchema = z.object({
  id: z.uuid(),
  peran: peranSchema,
  nama: z.string(),
  nomorHp: z.string().nullable(),
  resort: z.string().nullable(),
  aktif: z.boolean(),
  dinonaktifkanAt: z.string().nullable(),
  alasanNonaktif: z.string().nullable(),
  /** HP yang sedang tertaut. */
  perangkatAktif: z.number(),
});

/** `PATCH /pengguna/:id` — `null` menghapus (nomor HP bos wajib; resort hanya kolektor). */
export const ubahPenggunaSchema = z
  .object({
    nama: z.string().trim().min(1).max(50).optional(),
    nomorHp: nomorHpSchema.nullable().optional(),
    resort: z.string().trim().min(1).max(50).nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Isi paling sedikit satu kolom");
export type UbahPenggunaInput = z.infer<typeof ubahPenggunaSchema>;

/** `POST /pengguna/:id/nonaktifkan` — semua perangkatnya ikut diputus. */
export const nonaktifkanSchema = z.object({ alasan: z.string().trim().min(1).max(200) });
export type NonaktifkanInput = z.infer<typeof nonaktifkanSchema>;
