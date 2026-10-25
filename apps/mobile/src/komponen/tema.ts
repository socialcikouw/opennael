import type { TextStyle } from "react-native";

/**
 * TOKEN TAMPILAN HP — satu-satunya tempat angka gaya. Warna diambil dari palet
 * Tailwind yang sama dengan `apps/web` (emerald = merek, slate = netral), jarak
 * kelipatan 4 pt, ukuran huruf skala Tailwind dalam pt (`base` = 16).
 * Layar memakai komponen di `ui.tsx`; token dipakai langsung hanya untuk
 * tata letak khusus layar.
 */

const slate = {
  50: "#f8fafc",
  100: "#f1f5f9",
  200: "#e2e8f0",
  300: "#cbd5e1",
  400: "#94a3b8",
  500: "#64748b",
  600: "#475569",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
} as const;

const emerald = {
  50: "#ecfdf5",
  100: "#d1fae5",
  200: "#a7f3d0",
  600: "#059669",
  700: "#047857",
  800: "#065f46",
} as const;

const red = {
  50: "#fef2f2",
  100: "#fee2e2",
  200: "#fecaca",
  500: "#ef4444",
  600: "#dc2626",
  700: "#b91c1c",
  800: "#991b1b",
} as const;

const amber = {
  50: "#fffbeb",
  100: "#fef3c7",
  200: "#fde68a",
  700: "#b45309",
  800: "#92400e",
} as const;

export const WARNA = {
  putih: "#ffffff",
  hitam: "#000000",

  /** Latar layar. */
  latar: slate[50],
  /** Kartu, isian, tombol kedua. */
  permukaan: "#ffffff",
  /** Isi abu: avatar, lencana netral. */
  abu: slate[100],
  /** Alas kontrol bersegmen. */
  abuTua: slate[200],
  /** Garis kartu. */
  garis: slate[200],
  /** Garis isian & tombol kedua. */
  garisTegas: slate[300],

  teks: slate[900],
  teksTombol: slate[800],
  teksLabel: slate[700],
  teksKedua: slate[600],
  redup: slate[500],
  samar: slate[400],

  utama: emerald[700],
  utamaTua: emerald[800],
  utamaFokus: emerald[600],
  utamaMuda: emerald[100],
  utamaLembut: emerald[50],
  utamaGaris: emerald[200],

  bahaya: red[700],
  bahayaTua: red[800],
  bahayaTeks: red[600],
  bahayaBingkai: red[500],
  bahayaMuda: red[100],
  bahayaLembut: red[50],
  bahayaGaris: red[200],

  waspada: amber[700],
  waspadaTua: amber[800],
  waspadaMuda: amber[100],
  waspadaLembut: amber[50],
  waspadaGaris: amber[200],
} as const;

/** Jarak kelipatan 4 pt — kunci = angka skala Tailwind (`5` = 20 pt, seperti `p-5`). */
export const RUANG = {
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const SUDUT = {
  kecil: 8,
  sedang: 12,
  besar: 16,
  lebar: 24,
  bulat: 9999,
} as const;

/** Ukuran huruf + tinggi baris (skala Tailwind dalam pt). */
export const HURUF = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 26 },
  xl: { fontSize: 20, lineHeight: 28 },
  "2xl": { fontSize: 24, lineHeight: 32 },
  "3xl": { fontSize: 30, lineHeight: 36 },
} as const satisfies Record<string, TextStyle>;

export const TEBAL = {
  sedang: "500",
  semi: "600",
  tebal: "700",
  ekstra: "800",
} as const satisfies Record<string, TextStyle["fontWeight"]>;

/** Tinggi sentuhan minimal (pedoman iOS 44 pt). */
export const SENTUH = { kecil: 40, sedang: 44, besar: 52, isianUang: 56 } as const;

/** Bayangan tipis kartu — `boxShadow` berlaku di iOS & Android (arsitektur baru). */
export const BAYANGAN = {
  kecil: "0px 1px 2px rgba(15, 23, 42, 0.06)",
  sedang: "0px 1px 3px rgba(15, 23, 42, 0.10)",
  /** Benda yang melayang di atas isi layar (tab bar mengambang). */
  mengambang: "0px 6px 20px rgba(15, 23, 42, 0.14)",
} as const;
