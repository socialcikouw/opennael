import type { Portofolio, PortofolioJenis } from "@opennael/contracts";
import type { JenisPinjaman } from "@opennael/domain";

const STATUS = ["berjalan", "macet", "diputihkan"] as const;

/**
 * Portofolio satu jenis, atau ketiganya dijumlah (`jenis` null = Semua Jenis). Server memberi
 * angka per jenis sekaligus (`GET /lapangan/portofolio`), jadi layar Portofolio menampilkan
 * gabungan & rincian per jenis dari satu permintaan.
 */
export function portofolioUntuk(data: Portofolio, jenis: JenisPinjaman | null): PortofolioJenis {
  if (jenis) return data[jenis];
  const semua = [data.harian, data.mingguan, data.tempoan];
  const jumlah = (status: (typeof STATUS)[number]) => ({
    jumlah: semua.reduce((n, j) => n + j[status].jumlah, 0),
    saldo: semua.reduce((n, j) => n + j[status].saldo, 0),
  });
  return { berjalan: jumlah("berjalan"), macet: jumlah("macet"), diputihkan: jumlah("diputihkan") };
}

/** Piutang aktif (berjalan + macet, aturan-usaha M) dan banyak pinjamannya — baris per jenis. */
export function piutangAktif(p: PortofolioJenis): { jumlah: number; saldo: number; macet: number } {
  return {
    jumlah: p.berjalan.jumlah + p.macet.jumlah,
    saldo: p.berjalan.saldo + p.macet.saldo,
    macet: p.macet.jumlah,
  };
}
