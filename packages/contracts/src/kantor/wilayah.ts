import { z } from "zod";

/** Kampung nasabah baru: dipilih dari daftar, atau diketik (dibuat bila belum ada). */
export const kampungSchema = z.union([
  z.object({ wilayahId: z.uuid() }),
  z.object({ nama: z.string().trim().min(1).max(50) }),
]);

/** `GET /lapangan/kampung` — pilihan kampung di formulir akad. */
export const kampungPilihanSchema = z.object({ id: z.uuid(), nama: z.string() });

/**
 * KAMPUNG — daftar dengan pemakaian (semua peran), ganti nama / gabung &
 * hapus kampung kosong (bos). Kampung baru lahir dari formulir nasabah.
 * Docs: schema-wilayah.md.
 */

/** `GET /wilayah` — `baru` (bos): kampung yang muncul N hari terakhir. */
export const saringWilayahSchema = z.object({
  baru: z.coerce.number().int().min(1).max(90).optional(),
});

export const wilayahSchema = z.object({
  id: z.uuid(),
  nama: z.string(),
  kunci: z.string(),
  /** Nasabah yang berpinjaman berjalan / macet. */
  nasabahAktif: z.number(),
  nasabahTotal: z.number(),
  /** Banyak rute kolektor yang memuat kampung ini. */
  dipakaiRute: z.number(),
  dibuatOleh: z.object({ id: z.uuid(), nama: z.string() }),
  dibuatAt: z.string(),
});
export type WilayahJawaban = z.infer<typeof wilayahSchema>;

/** `POST /wilayah/ganti-nama` — gabung bila nama baru sudah dipakai kampung lain. */
export const gantiNamaWilayahSchema = z.object({
  dari: z.uuid(),
  ke: z.string().trim().min(1).max(50),
});

export const hasilGantiNamaWilayahSchema = wilayahSchema.extend({
  /** `true` = kampung lama digabung ke kampung bernama sama yang sudah ada. */
  digabung: z.boolean(),
});

/** `DELETE /wilayah/:id` — kampung yang dihapus. */
export const wilayahDihapusSchema = z.object({ id: z.uuid(), nama: z.string() });
