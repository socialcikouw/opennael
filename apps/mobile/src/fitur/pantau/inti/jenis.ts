import type { JenisPinjaman } from "@opennael/domain";

/**
 * Saringan jenis pinjaman di tab-tab pantau mode Semua (Storting, Droping):
 * Semua atau satu jenis. PURE.
 */
export type SaringJenis = "semua" | JenisPinjaman;

export const SARING_JENIS: readonly { nilai: SaringJenis; label: string }[] = [
  { nilai: "semua", label: "Semua" },
  { nilai: "harian", label: "Harian" },
  { nilai: "mingguan", label: "Mingguan" },
  { nilai: "tempoan", label: "Tempoan" },
];

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
