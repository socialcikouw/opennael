import { z } from "zod";

/**
 * Skema dasar yang dipakai banyak konteks — satu definisi, bukan salinan per
 * berkas. Internal paket (tidak diekspor dari `index.ts`).
 */

/**
 * Teks isian (nama, kampung, alasan, keterangan): dirapikan lalu DIKECILKAN —
 * selalu disimpan huruf kecil (konvensi skema #10, docs/tampilan.md). Database
 * menjaganya dengan CHECK `<tabel>_huruf_kecil_check`.
 */
export const teksKecil = (maks: number, min = 1) =>
  z.string().trim().min(min).max(maks).toLowerCase();

/** Uang: rupiah bulat, tanpa pecahan, tidak negatif. */
export const rupiah = z.number().int().min(0);

/** Tanggal pembukuan `YYYY-MM-DD`. */
export const tanggal = z.iso.date();

/** Rujukan ringkas ke seorang pengguna/pegawai. */
export const orang = z.object({ id: z.uuid(), nama: z.string() });
