import { z } from "zod";

/** Batas ukuran foto (dijaga juga CHECK `foto_ukuran_check`). */
export const UKURAN_FOTO_MAKS = 2_000_000;

/**
 * `POST /foto` (multipart/form-data) — foto dari KAMERA HP, sudah dikompres &
 * disimpan ulang di HP (EXIF terbuang). Lokasi & jam HP opsional (pembanding).
 */
export const unggahFotoSchema = z.object({
  jenis: z.enum(["serah_terima", "ktp"]),
  berkas: z.file(),
  diambilAt: z.iso.datetime().optional(),
  latitude: z.coerce.number().min(-11).max(6).optional(),
  longitude: z.coerce.number().min(95).max(141).optional(),
  akurasiMeter: z.coerce.number().int().positive().max(32767).optional(),
});

export const fotoTersimpanSchema = z.object({
  id: z.uuid(),
  jenis: z.enum(["serah_terima", "ktp"]),
  ukuranByte: z.number(),
  tipeMime: z.enum(["image/jpeg", "image/webp"]),
  dibuatAt: z.iso.datetime(),
});
export type FotoTersimpan = z.infer<typeof fotoTersimpanSchema>;
