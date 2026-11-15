/**
 * PALET MENTAH — LAPIS 1 tema. SATU-SATUNYA tempat nilai warna (hex / rgba) boleh
 * ditulis di aplikasi HP; dijaga `bun run cek:arsitektur` (aturan `warna-literal`).
 *
 * Bukan untuk dipakai layar. Layar hanya memakai TOKEN SEMANTIK di `token.ts`
 * (`WARNA.permukaan`, bukan `slate[900]`), sehingga mengganti tampilan seluruh
 * aplikasi = mengubah rujukan di `token.ts` (atau nilai di sini), tanpa menyentuh
 * satu layar pun. Berkas ini tak mengimpor apa pun supaya `app.config.ts` boleh
 * membacanya (lihat `native.ts`).
 *
 * Skala = Tailwind (sama dengan web bos): slate = netral, emerald = merek.
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
  slate,
  emerald,
  red,
  amber,
  violet,
  orange,
  teal,
  /** Putih & hitam mutlak (di atas foto, latar kamera) — sama di mana pun. */
  mutlak: { putih: "#ffffff", hitam: "#000000" },
  /** Lapisan tembus pandang: di atas foto (gelap) dan di atas latar gelap (terang). */
  tirai: { gelap: "rgba(2, 6, 23, 0.6)", terang: "rgba(255, 255, 255, 0.18)" },
  /**
   * Bayangan (`boxShadow`); hanya dipakai lewat `bayangan.ts` (iOS saja). Tahap 3 tema
   * memutuskan nasibnya — di latar gelap bayangan nyaris tak terlihat.
   */
  bayangan: {
    kecil: "0px 1px 2px rgba(15, 23, 42, 0.06)",
    sedang: "0px 1px 3px rgba(15, 23, 42, 0.10)",
    mengambang: "0px 6px 20px rgba(15, 23, 42, 0.14)",
    panelBawah: "0px -4px 16px rgba(15, 23, 42, 0.08)",
  },
  /**
   * Warna aset native bawaan templat Expo (latar splash, latar ikon adaptif) — SEMENTARA:
   * ikut diganti bersama identitas APK (nama & ikon) dan desain ulang tema (Tahap 3).
   */
  native: { splash: "#208AEF", ikonAdaptif: "#E6F4FE" },
} as const;
