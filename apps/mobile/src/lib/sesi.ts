import { buatSesi, type Sesi, useSesi as useSesiDasar } from "@opennael/api-client";
import { penyimpanSesi } from "@/platform/brankas";

/**
 * SESI di HP — token & profil disimpan di brankas aman (`platform/brankas.ts`).
 * Satu sumber untuk klien API (membaca & memperbarui token) dan layar (siapa
 * yang sedang masuk).
 */
export type { Sesi };

/** `ambil()` = `undefined` selama belum selesai dibaca dari brankas; `null` = belum masuk. */
export const sesi = buatSesi(penyimpanSesi);

/** Sesi untuk layar — berubah otomatis saat masuk, refresh, atau keluar. */
export function useSesi(): Sesi | null | undefined {
  return useSesiDasar(sesi);
}
