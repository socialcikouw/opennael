import type { NamaIkon } from "../ui/daftar-ikon";
import type { SegmenVM, SelisihVM } from "./komposisi";

/**
 * KONTRAK VM KARTU STATISTIK bersama layar Rekap (Ringkasan, Performa, Portofolio — rupa
 * aplikasi lama, 27 Nov 2026). Tiap fitur menyusun VM-nya sendiri di `inti/` (murni, diuji);
 * komponen di folder ini hanya menempelkan angka & teks. Angka = rupiah, kecuali `satuan`
 * diisi (mis. "nasabah") — lalu tampil "12 nasabah".
 */

export type { SegmenVM, SelisihVM };

export interface RincianVM {
  ikon: NamaIkon;
  label: string;
  nilai: number;
  /** Diisi = hitungan ("12 orang"), bukan rupiah. */
  satuan?: string;
  /** Warna nilai: bahaya (tekor, macet) / sukses (lebih setor). */
  nada?: "bahaya" | "sukses";
}

export interface KartuVM {
  kunci: string;
  judul: string;
  ikon: NamaIkon;
  nilai: number;
  /** Diisi = hitungan, bukan rupiah. */
  satuan?: string;
  rumus: string | null;
  /** Keterangan kecil di bawah rumus. */
  meta: string | null;
  selisih: SelisihVM | null;
  segmen: SegmenVM[] | null;
  rincian: RincianVM[];
  /** 2×2 keping (4 rincian) atau daftar baris. */
  grid: boolean;
  kaki: RincianVM | null;
  /** Kartu bisa diketuk menuju rincian (fitur memutuskan tujuannya); null = tidak. */
  daftar: string | null;
}

export interface SorotVM {
  label: string;
  ikon: NamaIkon;
  nilai: number;
  /** Keping kecil di kepala: "Perkiraan", "Sudah Dibayar", "Minus", "12% macet". */
  lencana: string | null;
  rumus: string;
  selisih: SelisihVM | null;
  segmen: SegmenVM[] | null;
  keping: { label: string; nilai: number }[];
  /** Satu keping di bawah, di tengah (mis. Tabungan keluar). */
  kepingBawah: { label: string; nilai: number } | null;
}

/** "Rp 1.250.000" atau "12 nasabah". */
export function teksNilai(
  nilai: number,
  satuan: string | undefined,
  rupiah: (n: number) => string,
): string {
  return satuan ? `${nilai.toLocaleString("id-ID")} ${satuan}` : rupiah(nilai);
}
