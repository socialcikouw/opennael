import type { JenisPinjaman } from "./akad";
import { geserTanggal } from "./kalender";

/**
 * MACET — docs/aturan-usaha.md bagian F. Dinilai sapuan tutup hari untuk hari
 * yang baru ditutup; pemanggil memberi agregat yang sudah dipotong jendela.
 *
 *   harian   : macet ⟺ setoran murni jendela < 5 × angsuran (F1)
 *   mingguan : macet ⟺ setoran murni jendela < 1 × angsuran (F2)
 *   tempoan  : macet ⟺ belum lunas pada tutup hari batas lunas (F3, A4)
 *
 * Harian & mingguan dua arah (F4); tempoan keluar dari macet hanya lewat lunas.
 * Libur tidak memaafkan (F5).
 */
export const ATURAN_MACET = {
  /** Lebar jendela kalender (hari), termasuk hari yang dinilai. */
  jendelaHari: 30,
  harian: { ambangAngsuran: 5, minHariTagih: 15 },
  mingguan: { ambangAngsuran: 1 },
} as const;

export type StatusAktif = "berjalan" | "macet";

/** Awal jendela yang berakhir pada `tanggal` (ikut dihitung). */
export function awalJendelaMacet(tanggal: string): string {
  return geserTanggal(tanggal, -(ATURAN_MACET.jendelaHari - 1));
}

/** Hari pinjaman masuk pembukuan: tanggal akad, atau hari disalin untuk migrasi. */
export function tanggalMasukPembukuan(p: {
  tanggalAkad: string;
  tanggalDisalin: string | null;
}): string {
  return p.tanggalDisalin ?? p.tanggalAkad;
}

/** B1. Mulai ditagih: sehari sesudah akad; pinjaman migrasi sejak hari disalin. */
export function mulaiDitagih(p: { tanggalAkad: string; tanggalDisalin: string | null }): string {
  return p.tanggalDisalin ?? geserTanggal(p.tanggalAkad, 1);
}

export interface BahanMacet {
  jenis: JenisPinjaman;
  status: StatusAktif;
  angsuran: number;
  tanggalMasuk: string;
  /** Tempoan: batas lunas (hari masuk kerja ke-10, A4); null = belum sampai. Jenis lain: null. */
  batasTempo: string | null;
  /** Harian: hari tagih dalam jendela sejak mulai ditagih. Jenis lain: diabaikan. */
  hariTagih: number;
  /** Σ setoran murni transaksi berlaku dalam jendela. */
  setoranMurni: number;
}

export interface HasilMacet {
  /** `false` = datanya belum cukup → status dibiarkan. */
  dievaluasi: boolean;
  /** Status seharusnya; ≠ status tersimpan berarti berpindah. */
  status: StatusAktif;
}

/** Menilai satu pinjaman aktif pada penutupan hari `tanggal`. */
export function nilaiMacet(bahan: BahanMacet, tanggal: string): HasilMacet {
  if (bahan.jenis === "tempoan") {
    if (bahan.batasTempo !== null && tanggal >= bahan.batasTempo) {
      return { dievaluasi: true, status: "macet" };
    }
    // Tempoan tidak pulih lewat sapuan (F4).
    return { dievaluasi: true, status: bahan.status };
  }
  const dievaluasi =
    bahan.jenis === "harian"
      ? bahan.hariTagih >= ATURAN_MACET.harian.minHariTagih
      : bahan.tanggalMasuk <= awalJendelaMacet(tanggal);
  if (!dievaluasi) return { dievaluasi, status: bahan.status };
  const ambang =
    bahan.angsuran *
    (bahan.jenis === "harian"
      ? ATURAN_MACET.harian.ambangAngsuran
      : ATURAN_MACET.mingguan.ambangAngsuran);
  return { dievaluasi, status: bahan.setoranMurni < ambang ? "macet" : "berjalan" };
}
