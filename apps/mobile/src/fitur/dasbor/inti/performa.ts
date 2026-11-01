/**
 * PERFORMA TAGIHAN MURNI di Dasbor — deret harian dari `GET /ringkasan/performa`
 * (aturan-usaha N: setoran murni harian ÷ patokan; hanya pinjaman harian)
 * disaring ke HARI TAGIH. Server memberi satu baris untuk setiap tanggal, termasuk
 * Minggu dan libur kantor — di sana setoran memang nol, dan menampilkannya sebagai
 * 0% akan menyesatkan.
 */

export interface BarisPerforma {
  tanggal: string;
  setoranMurni: number;
  /** null = belum ada potret kemarin. */
  patokan: number | null;
  /** null = belum ada potret kemarin, atau patokan ≤ 0. */
  persentase: number | null;
}

export interface TitikPerforma {
  tanggal: string;
  persentase: number | null;
  /** Hari ini belum selesai — digambar beda dari hari-hari yang sudah lewat. */
  hariIni: boolean;
}

export interface RingkasPerforma {
  /** Hari ini; null bila bukan hari tagih (atau kalender belum dimuat). */
  hariIni: Pick<BarisPerforma, "setoranMurni" | "patokan" | "persentase"> | null;
  /** Satu titik per hari tagih sejak awal rentang s/d hari ini, urut tanggal. */
  titik: TitikPerforma[];
  /** Rata-rata persentase hari tagih yang SUDAH lewat (tanpa hari ini); null = belum ada. */
  rataRata: number | null;
}

export function susunPerforma(
  deret: readonly BarisPerforma[],
  hariTagih: readonly string[] | undefined,
  hariIni: string,
): RingkasPerforma {
  if (!hariTagih) return { hariIni: null, titik: [], rataRata: null };
  const tagih = new Set(hariTagih);
  const baris = deret.filter((b) => b.tanggal <= hariIni && tagih.has(b.tanggal));
  const titik = baris
    .map((b) => ({ tanggal: b.tanggal, persentase: b.persentase, hariIni: b.tanggal === hariIni }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  const lalu = titik.flatMap((t) => (!t.hariIni && t.persentase !== null ? [t.persentase] : []));
  const sekarang = baris.find((b) => b.tanggal === hariIni);
  return {
    hariIni: sekarang
      ? {
          setoranMurni: sekarang.setoranMurni,
          patokan: sekarang.patokan,
          persentase: sekarang.persentase,
        }
      : null,
    titik,
    rataRata: lalu.length > 0 ? Math.round(lalu.reduce((a, b) => a + b, 0) / lalu.length) : null,
  };
}
