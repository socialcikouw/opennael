import type { Portofolio, PortofolioJenis } from "@opennael/contracts";
import type { JenisPinjaman } from "@opennael/domain";

const STATUS = ["berjalan", "macet", "diputihkan"] as const;

/**
 * Portofolio untuk satu mode: jenisnya sendiri, atau ketiganya dijumlah untuk
 * mode Semua (`jenis` null). Server memberi angka per jenis sekaligus, jadi
 * pindah mode tak perlu permintaan ulang.
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
