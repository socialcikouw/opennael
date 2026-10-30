import { z } from "zod";

/**
 * Skema dasar yang dipakai banyak konteks — satu definisi, bukan salinan per
 * berkas. Internal paket (tidak diekspor dari `index.ts`).
 */

/** Uang: rupiah bulat, tanpa pecahan, tidak negatif. */
export const rupiah = z.number().int().min(0);

/** Tanggal pembukuan `YYYY-MM-DD`. */
export const tanggal = z.iso.date();

/** Rujukan ringkas ke seorang pengguna/pegawai. */
export const orang = z.object({ id: z.uuid(), nama: z.string() });
