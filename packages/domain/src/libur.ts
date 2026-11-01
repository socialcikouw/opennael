import type { JenisPinjaman } from "./akad";
import { hariTagihMingguan } from "./kalender";
import { sudahJatuhTempo } from "./tagih";

/**
 * LIBUR NASABAH — docs/aturan-usaha.md G1–G3: boleh-tidaknya pinjaman ini
 * diliburkan hari ini. null = boleh. Dipakai server (penolakan) dan aplikasi
 * kolektor (tombol Libur mati beserta alasannya) — satu aturan.
 */
export function tolakLibur(
  p: { jenis: JenisPinjaman; tanggalAkad: string; jatuhTempo: string | null; angsuranKe: number },
  hariIni: string,
): { kode: string; pesan: string } | null {
  // G1: tempoan hanya sejak jatuh tempo; G3 tak berlaku (angsuran terbayarnya 0 sampai lunas).
  if (p.jenis === "tempoan") {
    return sudahJatuhTempo(p, hariIni)
      ? null
      : { kode: "LIBUR_TIDAK_BERLAKU", pesan: "Tempoan baru boleh libur sejak jatuh tempo" };
  }
  if (p.jenis === "mingguan" && !hariTagihMingguan(p.tanggalAkad, hariIni)) {
    return {
      kode: "LIBUR_BUKAN_HARI_TAGIH",
      pesan: "Hari ini bukan hari tagih pinjaman mingguan ini",
    };
  }
  if (p.angsuranKe < 2) {
    return {
      kode: "LIBUR_BELUM_BOLEH",
      pesan: "Pinjaman yang baru terbayar 0–1 angsuran belum boleh libur",
    };
  }
  return null;
}

/** G1: libur tempoan wajib beralasan (mis. "belum ada uang"). */
export function liburPerluAlasan(p: { jenis: JenisPinjaman }): boolean {
  return p.jenis === "tempoan";
}
