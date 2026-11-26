import type { JenisPinjaman } from "./akad";
import { hariTagihMingguan } from "./kalender";
import { batasLunasTempoan, sudahJatuhTempo } from "./tagih";

/**
 * LIBUR NASABAH — docs/aturan-usaha.md G1–G3: boleh-tidaknya pinjaman ini
 * diliburkan hari ini. null = boleh. Dipakai server (penolakan) dan aplikasi
 * kolektor (tombol Libur / Janji Besok mati beserta alasannya) — satu aturan.
 */
export function tolakLibur(
  p: {
    jenis: JenisPinjaman;
    tanggalAkad: string;
    jatuhTempo: string | null;
    batasTempo: string | null;
    angsuranKe: number;
  },
  hariIni: string,
): { kode: string; pesan: string } | null {
  // G1: tempoan = janji besok, sejak jatuh tempo sampai sebelum batas lunas (A4); G3 tak
  // berlaku (angsuran terbayarnya 0 sampai lunas).
  if (p.jenis === "tempoan") {
    if (!sudahJatuhTempo(p, hariIni)) {
      return { kode: "LIBUR_TIDAK_BERLAKU", pesan: "Janji besok baru bisa sejak jatuh tempo" };
    }
    if (batasLunasTempoan(p, hariIni)) {
      return { kode: "JANJI_HABIS", pesan: "Sudah janji 4 kali — wajib lunas hari ini" };
    }
    return null;
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
      pesan: "Nomor 0 dan 1 wajib harus bayar",
    };
  }
  return null;
}
