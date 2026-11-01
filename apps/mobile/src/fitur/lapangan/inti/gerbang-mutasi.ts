/**
 * GERBANG MUTASI KAS — kapan arus kas hari ini boleh tampil (dan laporan
 * boleh dibuka): semua yang wajib ditagih hari ini (aturan-usaha B6 — harian,
 * mingguan di hari tagihnya, tempoan sejak jatuh tempo) sudah dicatat (C6).
 * Selama belum, tab Mutasi bergembok. Mengikuti gerbang Mutasi aplikasi lama
 * (`naelcapital` `kas-harian/core/gerbang.ts`). PURE.
 *
 * Dua pelajaran dari aplikasi lama yang dipertahankan:
 * - "Belum ditagih = 0" tidak sama dengan "selesai": kolektor yang belum punya
 *   nasabah sama sekali juga nol. Membuka laporan mengunci catatan lapangan
 *   sampai besok, jadi keadaan itu TIDAK diajak membuka Mutasi.
 * - Selama data dimuat, gerbang MENAHAN (`memuat`): menahan sesaat hanya
 *   menunda satu ketukan; membuka sesaat bisa membuat kolektor mengunci harinya.
 * Laporan yang sudah dibuka selalu `siap` (server tak memeriksanya ulang).
 */
export type GerbangMutasi =
  | "memuat"
  | "belum-absen"
  | "tidak-kerja"
  | "belum-ada-nasabah"
  | "masih-menagih"
  | "siap";

export function hitungGerbangMutasi(b: {
  /** Hari kolektor hari ini; null = belum absen; undefined = belum dimuat. */
  hari:
    | { absensi: "masuk_kerja" | "tidak_kerja"; laporanDibukaAt: string | null }
    | null
    | undefined;
  /** Banyaknya pinjaman di daftar tagih; null = belum dimuat. */
  pinjaman: number | null;
  /** Banyaknya yang wajib ditagih hari ini tetapi belum dicatat. */
  belum: number;
  /** Ada transaksi/akad yang tercatat hari ini (mis. semua dilunasi hari ini). */
  adaCatatan: boolean;
}): GerbangMutasi {
  if (b.hari === undefined) return "memuat";
  if (b.hari === null) return "belum-absen";
  if (b.hari.absensi === "tidak_kerja") return "tidak-kerja";
  if (b.hari.laporanDibukaAt) return "siap";
  if (b.pinjaman === null) return "memuat";
  if (b.belum > 0) return "masih-menagih";
  if (b.pinjaman === 0 && !b.adaCatatan) return "belum-ada-nasabah";
  return "siap";
}
