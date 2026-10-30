import { z } from "zod";
import { nasabahBaruSchema } from "./pembiayaan/akad";
import { jenisPinjamanSchema } from "./pembiayaan/pinjaman";

/**
 * SALINAN MIGRASI (web bos, aturan-usaha A10) — pinjaman yang masih berjalan
 * di pembukuan lama (buku) disalin tanpa uang keluar. Docs:
 * docs/skema/schema-pinjaman.md.
 */

/** `POST /pinjaman/migrasi` */
export const migrasiSchema = z
  .object({
    nasabah: z.union([z.object({ nasabahId: z.uuid() }), nasabahBaruSchema]),
    /** Pemegang — wajib untuk orang baru; nasabah lama tetap pada pemegangnya. */
    kolektorId: z.uuid().optional(),
    jenis: jenisPinjamanSchema,
    tenor: z.number().int().positive(),
    pokok: z.number().int().positive(),
    /** Tanggal akad di buku — paling lambat hari ini. */
    tanggalAkad: z.iso.date(),
    /** Sisa saldo di buku. */
    saldo: z.number().int().positive(),
    /** Tabungan nasabah di buku — tabungan pembuka. */
    tabungan: z.number().int().min(0),
    /** Nomor pinjaman di buku; bawaan nomor berikutnya. */
    pinjamanKe: z.number().int().min(1).optional(),
    /** Di buku sudah macet → langsung macet sejak hari disalin. */
    macet: z.boolean().optional(),
  })
  .refine((v) => "nasabahId" in v.nasabah || v.kolektorId !== undefined, {
    message: "Pilih kolektor pemegang untuk nasabah baru",
    path: ["kolektorId"],
  });
export type MigrasiInput = z.infer<typeof migrasiSchema>;

export const hasilMigrasiSchema = z.object({
  id: z.uuid(),
  nasabah: z.object({ id: z.uuid(), nama: z.string(), baru: z.boolean() }),
  kolektor: z.object({ id: z.uuid(), nama: z.string() }),
  pinjamanKe: z.number(),
  jenis: jenisPinjamanSchema,
  tenor: z.number(),
  pokok: z.number(),
  totalKembali: z.number(),
  angsuran: z.number(),
  angsuranKe: z.number(),
  saldo: z.number(),
  tabunganMasuk: z.number(),
  status: z.enum(["berjalan", "macet"]),
  tanggalAkad: z.string(),
  tanggalDisalin: z.string(),
});
export type HasilMigrasi = z.infer<typeof hasilMigrasiSchema>;
