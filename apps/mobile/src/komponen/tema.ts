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
  950: "#020617",
} as const;

const emerald = {
  50: "#ecfdf5",
  100: "#d1fae5",
  200: "#a7f3d0",
  300: "#6ee7b7",
  400: "#34d399",
  500: "#10b981",
  600: "#059669",
  700: "#047857",
  800: "#065f46",
  900: "#064e3b",
  950: "#022c22",
} as const;

const red = {
  50: "#fef2f2",
  100: "#fee2e2",
  200: "#fecaca",
  300: "#fca5a5",
  400: "#f87171",
  500: "#ef4444",
  600: "#dc2626",
  700: "#b91c1c",
  800: "#991b1b",
  900: "#7f1d1d",
  950: "#450a0a",
} as const;

const amber = {
  50: "#fffbeb",
  100: "#fef3c7",
  200: "#fde68a",
  300: "#fcd34d",
  400: "#fbbf24",
  700: "#b45309",
  800: "#92400e",
  900: "#78350f",
  950: "#451a03",
} as const;

/**
 * PALET WARNA — dua mode dengan kunci yang sama (`TERANG`, `GELAP`). Layar
 * tidak mengimpor palet langsung: `useWarna()` / `useGaya()` di
 * `tampilan.tsx` memilih palet sesuai mode HP atau pilihan pengguna.
 */
export const TERANG = {
  /** Putih & hitam mutlak (latar QR, ikon di atas foto) — sama di kedua mode. */
  putih: "#ffffff",
  hitam: "#000000",

  /** Latar layar. */
  latar: slate[50],
  /** Kartu, isian, tombol kedua, tab bar. */
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

  /** Hijau untuk teks, ikon, tab aktif. */
  utama: emerald[700],
  /** Hijau berkontras lebih kuat (teks di atas `utamaMuda`). */
  utamaTua: emerald[800],
  utamaFokus: emerald[600],
  utamaMuda: emerald[100],
  utamaLembut: emerald[50],
  utamaGaris: emerald[200],
  /** Isi tombol utama & tombol (+). */
  utamaIsi: emerald[700],
  /** Teks/ikon di atas `utamaIsi`. */
  teksAtasUtama: "#ffffff",

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

  /** Lapisan gelap tembus pandang di atas foto (ikon petunjuk). */
  tiraiGelap: "rgba(15, 23, 42, 0.55)",
  /** Lapisan terang tembus pandang di atas latar gelap (tombol tutup layar penuh). */
  tiraiTerang: "rgba(255, 255, 255, 0.18)",
} as const;

export type Warna = { readonly [K in keyof typeof TERANG]: string };

/**
 * Mode gelap: latar slate-950, kartu slate-900. Warna aksen dibuat lebih
 * TERANG (emerald-400, red-400, amber-400) agar terbaca di latar gelap; latar
 * lembut (lencana, tab aktif) memakai tingkat 900–950. Tombol utama
 * emerald-500 dengan teks gelap — teks putih di atasnya kurang kontras.
 */
export const GELAP: Warna = {
  putih: "#ffffff",
  hitam: "#000000",

  latar: slate[950],
  permukaan: slate[900],
  abu: slate[800],
  abuTua: slate[700],
  garis: slate[800],
  garisTegas: slate[700],

  teks: slate[50],
  teksTombol: slate[100],
  teksLabel: slate[200],
  teksKedua: slate[300],
  redup: slate[400],
  samar: slate[500],

  utama: emerald[400],
  utamaTua: emerald[300],
  utamaFokus: emerald[500],
  utamaMuda: emerald[900],
  utamaLembut: emerald[950],
  utamaGaris: emerald[800],
  utamaIsi: emerald[500],
  teksAtasUtama: slate[950],

  bahaya: red[400],
  bahayaTua: red[300],
  bahayaTeks: red[400],
  bahayaBingkai: red[500],
  bahayaMuda: red[900],
  bahayaLembut: red[950],
  bahayaGaris: red[900],

  waspada: amber[400],
  waspadaTua: amber[300],
  waspadaMuda: amber[900],
  waspadaLembut: amber[950],
  waspadaGaris: amber[900],

  tiraiGelap: "rgba(2, 6, 23, 0.6)",
  tiraiTerang: "rgba(255, 255, 255, 0.18)",
};

/**
 * WARNA MODE aplikasi kolektor (Harian · Mingguan · Tempoan · Semua): aksen
 * teks/ikon (`teks`), latar lembut (`lembut`), dan isi tombol berteks
 * (`isi` + `teksIsi`). Harian = hijau merek; mode lain punya warnanya sendiri
 * supaya wajah aplikasi terasa berganti. Dipilih `useWarnaMode`.
 */
export type WarnaMode = { teks: string; lembut: string; isi: string; teksIsi: string };

export const MODE_TERANG = {
  harian: { teks: emerald[700], lembut: emerald[100], isi: emerald[700], teksIsi: "#ffffff" },
  mingguan: { teks: "#6d28d9", lembut: "#ede9fe", isi: "#6d28d9", teksIsi: "#ffffff" },
  tempoan: { teks: "#c2410c", lembut: "#ffedd5", isi: "#c2410c", teksIsi: "#ffffff" },
  semua: { teks: "#0f766e", lembut: "#ccfbf1", isi: "#0f766e", teksIsi: "#ffffff" },
} as const satisfies Record<string, WarnaMode>;

export const MODE_GELAP: Record<keyof typeof MODE_TERANG, WarnaMode> = {
  harian: { teks: emerald[400], lembut: emerald[950], isi: emerald[500], teksIsi: slate[950] },
  mingguan: { teks: "#a78bfa", lembut: "#2e1065", isi: "#8b5cf6", teksIsi: slate[950] },
  tempoan: { teks: "#fb923c", lembut: "#431407", isi: "#f97316", teksIsi: slate[950] },
  semua: { teks: "#2dd4bf", lembut: "#042f2e", isi: "#14b8a6", teksIsi: slate[950] },
};

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
  /** Judul kolom grid setoran — di luar skala Tailwind. */
  "3xs": { fontSize: 9, lineHeight: 12 },
  /** Label terkecil (judul tab bawah, isi grid) — di luar skala Tailwind. */
  "2xs": { fontSize: 10, lineHeight: 14 },
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 26 },
  xl: { fontSize: 20, lineHeight: 28 },
  "2xl": { fontSize: 24, lineHeight: 32 },
  "3xl": { fontSize: 30, lineHeight: 36 },
} as const satisfies Record<string, TextStyle>;

export const TEBAL = {
  biasa: "400",
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
