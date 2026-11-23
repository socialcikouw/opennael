/**
 * PALET MENTAH — LAPIS 1 tema. SATU-SATUNYA tempat nilai warna (hex / rgba) boleh
 * ditulis di aplikasi HP; dijaga `bun run cek:arsitektur` (aturan `warna-literal`).
 *
 * Bukan untuk dipakai layar. Layar hanya memakai TOKEN SEMANTIK di `token.ts`
 * (`WARNA.permukaan`, bukan `kertas[50]`), sehingga mengganti tampilan seluruh
 * aplikasi = mengubah rujukan di `token.ts` (atau nilai di sini), tanpa menyentuh
 * satu layar pun. Berkas ini tak mengimpor apa pun.
 *
 * ARAH PALET (Tahap 5, 24 Nov 2026 — pilihan pemilik lewat pratinjau): TERANG saja,
 * dasar PUTIH KERTAS (netral hangat, skala Tailwind `stone` + dua langkah kertas) dengan
 * warna utama TERAKOTA (seperti oranye Claude). Kolektor bekerja di bawah matahari:
 * teks gelap di atas latar terang paling terbaca dan tak memantulkan sekitar seperti
 * layar gelap. Hijau (`emerald`) tetap ada untuk arti BERHASIL, merah untuk BAHAYA /
 * BELUM BOLEH, amber tua untuk PERINGATAN — terpisah dari warna merek.
 */

/** Netral hangat "putih kertas": 50–100 dibuat khusus, 200 ke atas mendekati Tailwind `stone`. */
const kertas = {
  /** Kartu & yang melayang — putih hangat. */
  50: "#fffefb",
  /** Latar layar & isi netral — kertas. */
  100: "#f4f2ec",
  /** Garis & isi netral tegas — krem. */
  200: "#d9d5cc",
  500: "#78716c",
  600: "#57534e",
  700: "#44403c",
  800: "#292524",
  900: "#1c1917",
} as const;

/**
 * Terakota — warna utama. 400 (coral) terlalu terang untuk tulisan putih (3,1:1) maupun
 * untuk teks di atas kertas (2,8:1): ia HANYA dipakai sebagai isi (tombol, lingkaran)
 * bertulisan gelap. Teks & ikon terakota memakai 700.
 */
const terakota = {
  50: "#f8e6da",
  100: "#f3d3c2",
  200: "#e9b99f",
  400: "#d97757",
  500: "#c96442",
  700: "#a8461f",
  800: "#8f3d1d",
} as const;

const emerald = {
  50: "#ecfdf5",
  100: "#d1fae5",
  200: "#a7f3d0",
  700: "#047857",
  800: "#065f46",
} as const;

const red = {
  50: "#fef2f2",
  100: "#fee2e2",
  200: "#fecaca",
  600: "#dc2626",
  700: "#b91c1c",
  800: "#991b1b",
} as const;

const amber = {
  50: "#fffbeb",
  100: "#fef3c7",
  200: "#fde68a",
  800: "#92400e",
  900: "#78350f",
} as const;

export const PALET = {
  kertas,
  terakota,
  emerald,
  red,
  amber,
  /** Putih & hitam mutlak (di atas foto, latar kamera & QR) — sama di mana pun. */
  mutlak: { putih: "#ffffff", hitam: "#000000" },
  /**
   * Lapisan tembus pandang: `gelap` di atas foto, `terang` di atas latar hitam (tombol
   * tutup layar penuh), `kertas` menutup kartu yang sedang mencatat.
   */
  tirai: {
    gelap: "rgba(10, 10, 10, 0.6)",
    terang: "rgba(255, 255, 255, 0.18)",
    kertas: "rgba(255, 254, 251, 0.85)",
  },
  /**
   * Warna aset native bawaan templat Expo (latar ikon adaptif) — SEMENTARA: ikut diganti
   * bersama identitas APK (nama & ikon). Latar splash tak di sini: ia = `WARNA.utamaIsi`.
   */
  native: { ikonAdaptif: "#E6F4FE" },
} as const;
