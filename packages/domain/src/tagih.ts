import type { JenisPinjaman } from "./akad";
import { geserTanggal, hariPekanDari, hariTagihMingguan, selisihHari } from "./kalender";

/**
 * A4. Tempoan dihitung dari HARI MASUK KERJA kolektor pemegang sesudah akad: ke-6 =
 * jatuh tempo, janji besok paling banyak 4 kali (ke-6 s/d ke-9), ke-10 = batas lunas.
 * Tanggalnya dihitung server dari absen (`jatuhTempo`, `batasTempo` di kartu).
 */
export const TEMPO = { jatuhTempoKe: 6, janjiMaks: 4 } as const;

/** A4. Hari masuk kerja ke-berapa yang menjadi batas lunas (6 + 4 = 10). */
export const HARI_BATAS_TEMPO = TEMPO.jatuhTempoKe + TEMPO.janjiMaks;

/**
 * PERKIRAAN jatuh tempo tempoan (A4) dari tanggal akad: hari ke-6 Senin–Sabtu sesudahnya,
 * seolah kolektor masuk kerja tiap hari. Jatuh tempo sebenarnya dihitung server dari absen
 * kolektor (`jatuhTempo`); ini hanya untuk tampilan sebelum tanggal itu pasti.
 */
export function perkiraanJatuhTempo(tanggalAkad: string): string {
  let t = tanggalAkad;
  for (let n = 0; n < TEMPO.jatuhTempoKe; ) {
    t = geserTanggal(t, 1);
    if (hariPekanDari(t) !== 0) n++;
  }
  return t;
}

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
 * tempoan sejak jatuh tempo sampai sebelum batas lunas (A4 — pada batas lunas
 * nasabah tak menahan laporan; malamnya macet bila belum lunas, F3). Hari kerja
 * sendiri dijaga gerbang lapangan.
 */
export function wajibDitagihHariIni(
  p: {
    jenis: JenisPinjaman;
    tanggalAkad: string;
    jatuhTempo: string | null;
    batasTempo: string | null;
  },
  hariIni: string,
): boolean {
  if (p.jenis === "harian") return selisihHari(p.tanggalAkad, hariIni) > 0;
  if (p.jenis === "mingguan") return hariTagihMingguan(p.tanggalAkad, hariIni);
  return sudahJatuhTempo(p, hariIni) && !batasLunasTempoan(p, hariIni);
}

/** A4. Tempoan yang sudah sampai batas lunas (hari masuk kerja ke-10): janji habis, wajib lunas. */
export function batasLunasTempoan(
  p: { jenis: JenisPinjaman; batasTempo: string | null },
  hariIni: string,
): boolean {
  return p.jenis === "tempoan" && p.batasTempo !== null && p.batasTempo <= hariIni;
}

/**
 * Tempoan yang jatuh tempo hari ini atau sudah lewat (B6, G1). Akad hari ini tak
 * pernah (B1); jatuh tempo kosong = bukan tempoan → false.
 */
export function sudahJatuhTempo(
  p: { jenis: JenisPinjaman; tanggalAkad: string; jatuhTempo: string | null },
  hariIni: string,
): boolean {
  return (
    p.jenis === "tempoan" &&
    p.jatuhTempo !== null &&
    p.jatuhTempo <= hariIni &&
    selisihHari(p.tanggalAkad, hariIni) > 0
  );
}
