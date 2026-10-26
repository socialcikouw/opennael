import type { JenisPinjaman } from "./akad";
import { hariTagihMingguan } from "./kalender";

/**
 * LIBUR NASABAH — docs/aturan-usaha.md G1–G3: boleh-tidaknya pinjaman ini
 * diliburkan hari ini. null = boleh. Dipakai server (penolakan) dan aplikasi
 * kolektor (tombol Libur mati beserta alasannya) — satu aturan.
 */
export function tolakLibur(
  p: { jenis: JenisPinjaman; tanggalAkad: string; angsuranKe: number },
  hariIni: string,
): { kode: string; pesan: string } | null {
  if (p.jenis === "tempoan") {
    return { kode: "LIBUR_TIDAK_BERLAKU", pesan: "Pinjaman tempoan tidak punya hari libur" };
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
