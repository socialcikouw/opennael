import { wajib } from "./galat";

/**
 * AKAD PINJAMAN — docs/aturan-usaha.md bagian A. Hasil `syaratAkad`
 * DIBEKUKAN di baris pinjaman pada hari akad (A6): mengubah rumus di sini
 * hanya berlaku untuk akad berikutnya.
 */
export type JenisPinjaman = "harian" | "mingguan" | "tempoan";

/** A2. Harian & mingguan = jumlah kali bayar; tempoan = jangka HARI. */
export const TENOR_PINJAMAN: Record<JenisPinjaman, readonly number[]> = {
  harian: [25],
  mingguan: [6, 8, 10],
  tempoan: [7, 10, 14],
};

/** A1. */
export const KELIPATAN_POKOK = 100_000;

/** A2. Mingguan 6 kali hanya untuk pokok kelipatan ini — supaya 125% ÷ 6 tetap bulat. */
export const KELIPATAN_POKOK_MINGGUAN_6 = 300_000;

export interface SyaratAkad {
  jenis: JenisPinjaman;
  tenor: number;
  pokok: number;
  potonganAdmin: number;
  tabunganMasuk: number;
  /** Tunai sebelum dikurangi saldo pinjaman lama (gulung). */
  pencairan: number;
  totalKembali: number;
  angsuran: number;
}

export function tenorBerlaku(jenis: JenisPinjaman, tenor: number): boolean {
  return TENOR_PINJAMAN[jenis].includes(tenor);
}

/**
 * A1, A3 & A5. Potongan, pencairan, dan total kembali — SAMA untuk semua jenis (keputusan
 * pemilik 26 Nov 2026): admin 5% + tabungan 5% (dicairkan 90%), kembali 125%. Tak
 * bergantung tenor, jadi layar pokok bisa menampilkannya sebelum tenor dipilih.
 */
export function rincianPokok(
  pokok: number,
): Pick<SyaratAkad, "potonganAdmin" | "tabunganMasuk" | "pencairan" | "totalKembali"> {
  wajib(
    Number.isInteger(pokok) && pokok > 0 && pokok % KELIPATAN_POKOK === 0,
    "POKOK_TIDAK_SAH",
    "Pokok harus kelipatan Rp 100.000",
  );
  const potongan = pokok / 20;
  return {
    potonganAdmin: potongan,
    tabunganMasuk: potongan,
    pencairan: pokok - 2 * potongan,
    totalKembali: (pokok * 5) / 4,
  };
}

/** A1–A5. Angsuran = total kembali ÷ tenor; tempoan dibayar sekali (A4). */
export function syaratAkad(jenis: JenisPinjaman, pokok: number, tenor: number): SyaratAkad {
  const rincian = rincianPokok(pokok);
  wajib(
    tenorBerlaku(jenis, tenor),
    "TENOR_TIDAK_BERLAKU",
    `Tenor ${tenor} tidak berlaku untuk pinjaman ${jenis}`,
  );
  wajib(
    !(jenis === "mingguan" && tenor === 6) || pokok % KELIPATAN_POKOK_MINGGUAN_6 === 0,
    "POKOK_TIDAK_SAH",
    "Mingguan 6 kali: pokok harus kelipatan Rp 300.000",
  );
  return {
    jenis,
    tenor,
    pokok,
    ...rincian,
    angsuran: jenis === "tempoan" ? rincian.totalKembali : rincian.totalKembali / tenor,
  };
}

/** Jumlah angsuran yang sudah lunas — sama dengan kolom turunan `pinjaman.angsuran_ke`. */
export function angsuranKe(p: { totalKembali: number; saldo: number; angsuran: number }): number {
  return Math.floor((p.totalKembali - p.saldo) / p.angsuran);
}

export interface SyaratMigrasi extends SyaratAkad {
  /** Sisa saldo di buku lama — saldo awal salinan. */
  saldoAwal: number;
  /** Angsuran yang sudah lunas sebelum disalin. */
  angsuranKe: number;
}

/**
 * A10. Salinan migrasi: total kembali & angsuran seperti akad baru, tanpa uang
 * keluar; saldo awal = sisa saldo di buku; tabungan pembuka masuk tabungan.
 */
export function syaratMigrasi(
  jenis: JenisPinjaman,
  pokok: number,
  tenor: number,
  saldo: number,
  tabungan: number,
): SyaratMigrasi {
  const akad = syaratAkad(jenis, pokok, tenor);
  wajib(
    Number.isInteger(saldo) && saldo > 0 && saldo <= akad.totalKembali,
    "SALDO_MIGRASI_TIDAK_SAH",
    `Sisa saldo harus lebih dari 0 dan paling banyak total kembali (${akad.totalKembali})`,
  );
  wajib(
    Number.isInteger(tabungan) && tabungan >= 0,
    "TABUNGAN_MIGRASI_TIDAK_SAH",
    "Tabungan pembuka tidak boleh minus",
  );
  return {
    ...akad,
    potonganAdmin: 0,
    tabunganMasuk: tabungan,
    pencairan: 0,
    saldoAwal: saldo,
    angsuranKe: angsuranKe({ ...akad, saldo }),
  };
}
