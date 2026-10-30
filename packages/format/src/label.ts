import type { JenisPinjaman } from "@opennael/domain";

/** Label teks yang sama di web dan HP (warna/nada lencana tetap urusan tiap aplikasi). */

export const LABEL_JENIS: Record<JenisPinjaman, string> = {
  harian: "Harian",
  mingguan: "Mingguan",
  tempoan: "Tempoan",
};

/** Satuan tenor per jenis (A2): harian & mingguan = kali bayar, tempoan = hari. */
export function namaTenor(jenis: JenisPinjaman, tenor: number): string {
  return jenis === "tempoan" ? `${tenor} hari` : `${tenor}×`;
}

export const LABEL_STATUS_PINJAMAN = {
  berjalan: "Berjalan",
  macet: "Macet",
  lunas: "Lunas",
  digulung: "Digulung",
  batal: "Batal",
  diputihkan: "Diputihkan",
} as const;

export const LABEL_PERAN = {
  bos: "Bos",
  kasir: "Kasir",
  pengawas: "Pengawas",
  kolektor: "Kolektor",
} as const;

/** Jenis transaksi uang pinjaman. */
export const LABEL_JENIS_TRANSAKSI = {
  angsuran: "Angsuran",
  pelunasan: "Pelunasan",
  gulung: "Gulung",
} as const;

/** Peristiwa pinjaman = transaksi + libur nasabah. */
export const LABEL_PERISTIWA = { ...LABEL_JENIS_TRANSAKSI, libur: "Libur" } as const;
