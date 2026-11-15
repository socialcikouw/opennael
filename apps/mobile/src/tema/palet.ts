/**
 * PALET MENTAH — LAPIS 1 tema. SATU-SATUNYA tempat nilai warna (hex / rgba) boleh
 * ditulis di aplikasi HP; dijaga `bun run cek:arsitektur` (aturan `warna-literal`).
 *
 * Bukan untuk dipakai layar. Layar hanya memakai TOKEN SEMANTIK di `token.ts`
 * (`WARNA.permukaan`, bukan `neutral[900]`), sehingga mengganti tampilan seluruh
 * aplikasi = mengubah rujukan di `token.ts` (atau nilai di sini), tanpa menyentuh
 * satu layar pun. Berkas ini tak mengimpor apa pun.
 *
 * ARAH PALET (Tahap 3, 16 Nov 2026): netral MURNI hampir hitam (bukan biru-kelabu
 * seperti slate sebelumnya) + aksen hijau merek. Alasannya: kolektor memakai aplikasi
 * berjam-jam di luar ruangan — latar hitam pekat memberi kontras terbesar dan hemat
 * baterai layar OLED, sedangkan angka (nominal) tampil putih bersih di atasnya.
 * Skala = Tailwind `neutral`; dua langkah antara (550, 750) ditambahkan untuk garis.
 */

const neutral = {
  50: "#fafafa",
  100: "#f5f5f5",
  200: "#e5e5e5",
  300: "#d4d4d4",
  400: "#a3a3a3",
  500: "#737373",
  /** Antara 500 dan 600: batas isian & tombol — 3:1 di atas permukaan (aksesibilitas batas komponen). */
  550: "#666666",
  600: "#525252",
  700: "#404040",
  /** Antara 700 dan 800: garis kartu & pemisah — terlihat tanpa menjadi kerangka kawat. */
  750: "#333333",
  800: "#262626",
  900: "#171717",
  950: "#0a0a0a",
} as const;

const emerald = {
  300: "#6ee7b7",
  400: "#34d399",
  500: "#10b981",
  800: "#065f46",
  900: "#064e3b",
  950: "#022c22",
} as const;

const red = {
  300: "#fca5a5",
  400: "#f87171",
  500: "#ef4444",
  900: "#7f1d1d",
  950: "#450a0a",
} as const;

const amber = {
  300: "#fcd34d",
  400: "#fbbf24",
  900: "#78350f",
  950: "#451a03",
} as const;

/** Aksen mode kerja (Mingguan · Tempoan · Semua); Harian memakai emerald (merek). */
const violet = { 400: "#a78bfa", 500: "#8b5cf6", 950: "#2e1065" } as const;
const orange = { 400: "#fb923c", 500: "#f97316", 950: "#431407" } as const;
const teal = { 400: "#2dd4bf", 500: "#14b8a6", 950: "#042f2e" } as const;

export const PALET = {
  neutral,
  emerald,
  red,
  amber,
  violet,
  orange,
  teal,
  /** Putih & hitam mutlak (di atas foto, latar kamera & QR) — sama di mana pun. */
  mutlak: { putih: "#ffffff", hitam: "#000000" },
  /** Lapisan tembus pandang: di atas foto (gelap) dan di atas latar gelap (terang). */
  tirai: { gelap: "rgba(10, 10, 10, 0.6)", terang: "rgba(255, 255, 255, 0.18)" },
  /**
   * Warna aset native bawaan templat Expo (latar ikon adaptif) — SEMENTARA: ikut diganti
   * bersama identitas APK (nama & ikon). Latar splash tak di sini: ia = `WARNA.latar`.
   */
  native: { ikonAdaptif: "#E6F4FE" },
} as const;
