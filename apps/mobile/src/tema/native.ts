import { PALET } from "./palet";
import { WARNA } from "./token";

/**
 * TURUNAN NATIVE — LAPIS 3 tema. Nilai tema yang harus ada di konfigurasi native
 * (bukan di JS): gaya sistem, latar jendela, latar splash, latar ikon adaptif.
 * Sumbernya tetap token/palet; tak ada warna yang ditulis ulang di `app.json`.
 *
 * `app.config.ts` TIDAK mengimpor berkas ini: pemuat konfigurasi Expo memakai Node biasa
 * dan tak bisa membaca `.ts`. Jalurnya: berkas ini → `tema-native.json` (di akar
 * `apps/mobile`, dihasilkan, jangan disunting) → `app.config.ts`. Setelah mengubah
 * token yang berkaitan, hasilkan ulang: `bun apps/mobile/scripts/tulis-tema-native.ts`
 * (uji `native.test.ts` menggagalkan `bun run test` bila JSON-nya tertinggal).
 */
export const NATIVE = {
  /** Aplikasi bertema gelap saja: dialog bawaan, keyboard, bilah navigasi, dan status bar ikut gelap. */
  gaya: "dark",
  /** Latar jendela (tampil sebelum JS memuat & di balik keyboard) — sama dengan latar layar. */
  latar: WARNA.latar,
  /** Latar splash = latar layar: tak ada kilatan warna lain sebelum aplikasi tampil (logo splash putih). */
  splash: WARNA.latar,
  /** Latar ikon adaptif — warna templat sementara (lihat `palet.ts`); diganti bersama ikon merek. */
  ikonAdaptif: PALET.native.ikonAdaptif,
} as const;

/** Isi `tema-native.json` — satu-satunya bentuk yang dibaca `app.config.ts`. */
export function jsonNative(): string {
  return `${JSON.stringify({ _dihasilkanDari: "src/tema/native.ts — jangan disunting tangan", ...NATIVE }, null, 2)}\n`;
}
