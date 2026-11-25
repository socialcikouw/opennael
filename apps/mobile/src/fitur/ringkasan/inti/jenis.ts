import type { JenisPinjaman } from "@opennael/domain";
import type { SaringJenis } from "../../../komponen/pil-jenis";

/**
 * Saringan jenis pinjaman di segmen Storting & Droping (Ringkasan, Mode Rekap): Semua atau
 * satu jenis (pil `PilJenis`, `komponen/pil-jenis.tsx`). PURE.
 */
export type { SaringJenis };

/** Banyaknya butir per saringan — angka di pil. */
export function hitungPerJenis<T>(
  daftar: readonly T[],
  jenisDari: (t: T) => JenisPinjaman,
): Record<SaringJenis, number> {
  const hasil: Record<SaringJenis, number> = {
    semua: daftar.length,
    harian: 0,
    mingguan: 0,
    tempoan: 0,
  };
  for (const t of daftar) hasil[jenisDari(t)]++;
  return hasil;
}

export function saringJenis<T>(
  daftar: readonly T[],
  saring: SaringJenis,
  jenisDari: (t: T) => JenisPinjaman,
): T[] {
  return saring === "semua" ? [...daftar] : daftar.filter((t) => jenisDari(t) === saring);
}
