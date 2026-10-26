import type { JenisPinjaman } from "./akad";
import { hariTagihMingguan, selisihHari } from "./kalender";

/**
 * POSISI TAGIH — docs/aturan-usaha.md B5. Tertinggal & tunggakan dihitung
 * menurut jumlah angsuran yang sudah terbayar, bukan tanggal tiap setoran;
 * hari ini belum dihitung lewat.
 *
 *   harian   : jadwal = hari tagih s/d kemarin − libur nasabah (+ angsuran
 *              terbayar sebelum disalin), paling banyak tenor
 *   mingguan : jadwal = minggu yang jadwalnya sudah lewat − libur nasabah (B3)
 *   tempoan  : lewat jatuh tempo = seluruh saldo tertunggak
 *   tunggakan = tertinggal × angsuran, paling banyak sisa saldo
 */
export interface BahanTagih {
  jenis: JenisPinjaman;
  tenor: number;
  angsuran: number;
  totalKembali: number;
  saldoAwal: number;
  saldo: number;
  tanggalAkad: string;
  /** Hanya migrasi — angsuran yang terbayar sebelum disalin ikut jadwal harian. */
  tanggalDisalin: string | null;
  jatuhTempo: string | null;
  /** Harian: hari tagih kantor sejak mulai ditagih (B1) s/d kemarin. Jenis lain: diabaikan. */
  hariTagihLewat: number;
  /** Libur nasabah pinjaman ini s/d kemarin. */
  liburLewat: number;
}

export interface PosisiTagih {
  /** Angsuran yang seharusnya sudah masuk tapi belum (tempoan: 1 bila lewat jatuh tempo). */
  tertinggal: number;
  /** Rupiah tertinggal, paling banyak sisa saldo. */
  tunggakan: number;
}

/** Angsuran utuh yang sudah lunas bila kewajiban `totalKembali` tinggal `saldo`. */
function terbayar(totalKembali: number, saldo: number, angsuran: number): number {
  return angsuran > 0 ? Math.floor((totalKembali - saldo) / angsuran) : 0;
}

export function posisiTagih(b: BahanTagih, hariIni: string): PosisiTagih {
  if (b.saldo <= 0) return { tertinggal: 0, tunggakan: 0 };
  if (b.jenis === "tempoan") {
    const lewat = b.jatuhTempo !== null && hariIni > b.jatuhTempo;
    return lewat ? { tertinggal: 1, tunggakan: b.saldo } : { tertinggal: 0, tunggakan: 0 };
  }

  let jadwal: number;
  if (b.jenis === "harian") {
    const sebelumDisalin = b.tanggalDisalin ? terbayar(b.totalKembali, b.saldoAwal, b.angsuran) : 0;
    jadwal = b.hariTagihLewat - b.liburLewat + sebelumDisalin;
  } else {
    // Jadwal mingguan = akad + 7k; lewat ⟺ 7k < selisih (hari ini belum lewat).
    const selisih = selisihHari(b.tanggalAkad, hariIni);
    jadwal = Math.max(0, Math.floor((selisih - 1) / 7)) - b.liburLewat;
  }
  jadwal = Math.min(b.tenor, Math.max(0, jadwal));
  const tertinggal = Math.max(0, jadwal - terbayar(b.totalKembali, b.saldo, b.angsuran));
  return { tertinggal, tunggakan: Math.min(tertinggal * b.angsuran, b.saldo) };
}

/**
 * WAJIB DITAGIH HARI INI — docs/aturan-usaha.md B6 (yang menahan laporan, C6).
 * Pinjaman aktif yang sudah mulai ditagih (B1: bukan akad hari ini): harian
 * setiap hari kerja; mingguan hanya pada hari tagihnya (akad + 7k hari);
 * tempoan tidak pernah. Hari kerja sendiri dijaga gerbang lapangan.
 */
export function wajibDitagihHariIni(
  p: { jenis: JenisPinjaman; tanggalAkad: string },
  hariIni: string,
): boolean {
  if (p.jenis === "harian") return selisihHari(p.tanggalAkad, hariIni) > 0;
  if (p.jenis === "mingguan") return hariTagihMingguan(p.tanggalAkad, hariIni);
  return false;
}
