import { z } from "zod";

/**
 * Bentuk SETIAP jawaban galat API. `kode` stabil untuk dibaca program
 * (mis. `NOMOR_HP_DIPAKAI`); `pesan` untuk manusia (bahasa Indonesia).
 */
export const galatSchema = z.object({
  kode: z.string(),
  pesan: z.string(),
  /** Hanya galat validasi: masalah per field. */
  rincian: z.array(z.object({ jalur: z.string(), pesan: z.string() })).optional(),
});
export type Galat = z.infer<typeof galatSchema>;
