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
  mingguan: [8],
  tempoan: [7, 10, 14],
};

/** A1. */
export const KELIPATAN_POKOK = 100_000;

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

/** Tenor satu-satunya bila jenis ini hanya punya satu (harian 25, mingguan 8); null bila bisa dipilih. */
export function tenorTunggal(jenis: JenisPinjaman): number | null {
  const pilihan = TENOR_PINJAMAN[jenis];
  return pilihan.length === 1 ? (pilihan[0] ?? null) : null;
}

/**
 * A1, A3 & A5. Potongan, pencairan, dan total kembali per jenis (keputusan pemilik 26 Nov
 * 2026): harian & tempoan admin 5% + tabungan 5%, kembali 125%; mingguan admin 10% tanpa
 * tabungan, kembali 120%. Semua dicairkan 90%. Tak bergantung tenor, jadi layar pokok bisa
 * menampilkannya sebelum tenor dipilih.
 */
export function rincianPokok(
  jenis: JenisPinjaman,
  pokok: number,
): Pick<SyaratAkad, "potonganAdmin" | "tabunganMasuk" | "pencairan" | "totalKembali"> {
  wajib(
    Number.isInteger(pokok) && pokok > 0 && pokok % KELIPATAN_POKOK === 0,
    "POKOK_TIDAK_SAH",
    "Pokok harus kelipatan Rp 100.000",
  );
  const mingguan = jenis === "mingguan";
  const potonganAdmin = mingguan ? pokok / 10 : pokok / 20;
  const tabunganMasuk = mingguan ? 0 : pokok / 20;
  return {
    potonganAdmin,
    tabunganMasuk,
    pencairan: pokok - potonganAdmin - tabunganMasuk,
    totalKembali: mingguan ? (pokok * 6) / 5 : (pokok * 5) / 4,
  };
}

/** A1–A5. Angsuran = total kembali ÷ tenor; tempoan dibayar sekali (A4). */
export function syaratAkad(jenis: JenisPinjaman, pokok: number, tenor: number): SyaratAkad {
  const rincian = rincianPokok(jenis, pokok);
  wajib(
    tenorBerlaku(jenis, tenor),
    "TENOR_TIDAK_BERLAKU",
    `Tenor ${tenor} tidak berlaku untuk pinjaman ${jenis}`,
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
