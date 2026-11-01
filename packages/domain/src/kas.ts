import { wajib } from "./galat";

/**
 * KAS HARIAN KOLEKTOR — docs/aturan-usaha.md bagian I. Angka masukan
 * dijumlahkan server dari catatan hari itu (setoran, akad, transfer, biaya);
 * di sini hanya rumusnya.
 */

/**
 * I0. Kas lapangan & uang jalan saat masuk kerja (absen, pembetulan bos):
 * wajib, minimal Rp 5.000, kelipatan Rp 5.000 — masing-masing.
 */
export const ATURAN_KAS_PAGI = { minimal: 5_000, kelipatan: 5_000 } as const;

/** I0: nominal kas lapangan / uang jalan sah? */
export function kasPagiSah(nominal: number): boolean {
  return (
    Number.isInteger(nominal) &&
    nominal >= ATURAN_KAS_PAGI.minimal &&
    nominal % ATURAN_KAS_PAGI.kelipatan === 0
  );
}

/** Rincian satu hari kolektor yang menyusun tunai seharusnya. */
export interface RincianKas {
  kasLapangan: number;
  /** Σ storting setoran berlaku (negatif bila tabungan melebihi saldo saat lunas). */
  storting: number;
  /** Σ potongan tabungan akad berlaku hari itu. */
  tabunganMasuk: number;
  /** Σ potongan admin akad berlaku hari itu. */
  potonganAdmin: number;
  /** Σ droping akad berlaku hari itu (pokok penuh; gulung: drop baru + drop gulung). */
  droping: number;
  /** Σ transfer setoran berlaku (+ arsip transfer lama). */
  transfer: number;
  /** Σ biaya tak terduga berlaku. */
  biaya: number;
}

/**
 * I1. Tunai yang seharusnya diserahkan kolektor sore hari. Potongan tabungan
 * & admin ditambahkan kembali karena droping mencatat pokok penuh; uang jalan
 * tidak masuk. Boleh negatif (droping melebihi uang masuk).
 */
export function tunaiSeharusnya(r: RincianKas): number {
  return (
    r.kasLapangan +
    r.storting +
    r.tabunganMasuk +
    r.potonganAdmin -
    r.droping -
    r.transfer -
    r.biaya
  );
}

/** I2. Tekor (kurang setor, dipotong dari gaji) dan lebih setor dari `selisih_setor`. */
export function tekorDanLebih(selisihSetor: number): { tekor: number; lebihSetor: number } {
  return { tekor: Math.max(-selisihSetor, 0), lebihSetor: Math.max(selisihSetor, 0) };
}

/**
 * I3. Paling banyak bagian setoran yang boleh dicatat lewat transfer: uang
 * yang benar-benar dibayar nasabah. Gulung = 0 (tak ada uang dari nasabah).
 */
export function batasTransfer(t: {
  jenis: "angsuran" | "pelunasan" | "gulung";
  setoranMurni: number;
  setoranPelunasan: number;
}): number {
  switch (t.jenis) {
    case "angsuran":
      return t.setoranMurni + t.setoranPelunasan;
    case "pelunasan":
      return t.setoranMurni;
    case "gulung":
      return 0;
  }
}

// ---- kas kantor (docs/skema/schema-mutasi-kas-kantor.md) -----------------------

export type AkunKas = "tunai" | "bank";
export type JenisMutasiKas =
  | "setor_modal"
  | "tarik_modal"
  | "biaya_kantor"
  | "pindah_akun"
  | "lain_masuk"
  | "lain_keluar";

/** Arah tiap jenis mutasi: masuk (`keAkun`), keluar (`dariAkun`), atau pindah (keduanya). */
export const ARAH_MUTASI: Record<JenisMutasiKas, "masuk" | "keluar" | "pindah"> = {
  setor_modal: "masuk",
  lain_masuk: "masuk",
  tarik_modal: "keluar",
  biaya_kantor: "keluar",
  lain_keluar: "keluar",
  pindah_akun: "pindah",
};

/** Akun mutasi harus sesuai arah jenisnya — sama dengan `mutasi_kas_kantor_akun_check`. */
export function syaratAkunMutasi(m: {
  jenis: JenisMutasiKas;
  dariAkun?: AkunKas | null | undefined;
  keAkun?: AkunKas | null | undefined;
}): { dariAkun: AkunKas | null; keAkun: AkunKas | null } {
  const dari = m.dariAkun ?? null;
  const ke = m.keAkun ?? null;
  const arah = ARAH_MUTASI[m.jenis];
  const sah =
    arah === "masuk"
      ? ke !== null && dari === null
      : arah === "keluar"
        ? dari !== null && ke === null
        : dari !== null && ke !== null && dari !== ke;
  wajib(
    sah,
    "AKUN_MUTASI_TIDAK_SESUAI",
    arah === "masuk"
      ? "Mutasi masuk hanya mengisi akun tujuan"
      : arah === "keluar"
        ? "Mutasi keluar hanya mengisi akun asal"
        : "Pindah akun mengisi akun asal dan tujuan yang berbeda",
  );
  return { dariAkun: dari, keAkun: ke };
}
