import type {
  ArusJenis,
  PembandingPortofolio,
  Portofolio,
  PortofolioJenis,
  PotretJenis,
} from "@opennael/contracts";
import type { JenisPinjaman } from "@opennael/domain";
import { namaBulan } from "@opennael/format";

/**
 * PORTOFOLIO pegangan kolektor — penjumlahan per jenis & pembanding bulan lalu. Server memberi
 * angka per jenis sekaligus (`GET /lapangan/portofolio`), jadi pil jenis tak memicu permintaan
 * baru. Susunan kartu di `kartu-portofolio.ts`. PURE.
 */

export const URUTAN_JENIS: readonly JenisPinjaman[] = ["harian", "mingguan", "tempoan"];
const STATUS = ["berjalan", "macet", "diputihkan"] as const;

/** Satu jenis, atau ketiganya dijumlah (`jenis` null = Semua Jenis). */
export function portofolioUntuk(data: Portofolio, jenis: JenisPinjaman | null): PortofolioJenis {
  if (jenis) return data[jenis];
  const semua = URUTAN_JENIS.map((j) => data[j]);
  const jumlah = (status: (typeof STATUS)[number]) => ({
    jumlah: semua.reduce((n, j) => n + j[status].jumlah, 0),
    saldo: semua.reduce((n, j) => n + j[status].saldo, 0),
    angsuran: semua.reduce((n, j) => n + j[status].angsuran, 0),
    tabungan: semua.reduce((n, j) => n + j[status].tabungan, 0),
  });
  return {
    berjalan: jumlah("berjalan"),
    macet: jumlah("macet"),
    diputihkan: jumlah("diputihkan"),
    lunas: {
      jumlah: semua.reduce((n, j) => n + j.lunas.jumlah, 0),
      pokok: semua.reduce((n, j) => n + j.lunas.pokok, 0),
    },
    penyelesaian: {
      pokokBerkurang: semua.reduce((n, j) => n + j.penyelesaian.pokokBerkurang, 0),
      tabunganKeluar: semua.reduce((n, j) => n + j.penyelesaian.tabunganKeluar, 0),
    },
  };
}

/** Piutang aktif (berjalan + macet, aturan-usaha M) dan banyak pinjamannya. */
export function piutangAktif(p: PortofolioJenis): { jumlah: number; saldo: number; macet: number } {
  return {
    jumlah: p.berjalan.jumlah + p.macet.jumlah,
    saldo: p.berjalan.saldo + p.macet.saldo,
    macet: p.macet.jumlah,
  };
}

/** Pembanding satu jenis (atau ketiganya dijumlah) beserta labelnya. */
export interface Pembanding {
  /** Posisi akhir bulan lalu; null bila potretnya belum ada. */
  potret: PotretJenis | null;
  /** "akhir Oktober". */
  labelPotret: string;
  ini: ArusJenis;
  lalu: ArusJenis;
  /** "Oktober 1–28". */
  labelArus: string;
}

function jumlahkan<T extends Record<string, number>>(daftar: readonly T[]): T {
  const hasil: Record<string, number> = {};
  for (const d of daftar) {
    for (const [k, v] of Object.entries(d)) hasil[k] = (hasil[k] ?? 0) + v;
  }
  return hasil as T;
}

export function pembandingUntuk(pb: PembandingPortofolio, jenis: JenisPinjaman | null): Pembanding {
  const pilih = <T extends Record<string, number>>(per: Record<JenisPinjaman, T>): T =>
    jenis ? per[jenis] : jumlahkan(URUTAN_JENIS.map((j) => per[j]));
  const bulanLalu = namaBulan(pb.bulanLalu.mulai).split(" ")[0] ?? "";
  const bulanPotret = pb.tanggalPotret
    ? (namaBulan(pb.tanggalPotret).split(" ")[0] ?? bulanLalu)
    : bulanLalu;
  return {
    potret: pb.potret ? pilih(pb.potret) : null,
    labelPotret: `akhir ${bulanPotret}`,
    ini: pilih(pb.bulanIni.arus),
    lalu: pilih(pb.bulanLalu.arus),
    labelArus: `${bulanLalu} 1–${Number(pb.bulanLalu.selesai.slice(8, 10))}`,
  };
}
