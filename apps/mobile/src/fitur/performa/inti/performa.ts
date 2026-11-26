/**
 * PERFORMA TAGIHAN MURNI di layar Performa (Mode Rekap) — deret harian dari `GET /ringkasan/performa`
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
  setoranMurni: number;
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
  /** Rata-rata setoran murni per hari yang ikut rata-rata (rupiah bulat); null = belum ada. */
  rataMurni: number | null;
  /** Banyaknya hari yang ikut rata-rata (hari tagih lewat yang bernilai). */
  hariDinilai: number;
  /** Hari terbaik & terendah, dan banyaknya hari ≥ 90% (Sempurna & Luar Biasa) — hari lewat. */
  sorotan: { terbaik: TitikPerforma | null; terendah: TitikPerforma | null; hariTarget: number };
}

export function susunPerforma(
  deret: readonly BarisPerforma[],
  hariTagih: readonly string[] | undefined,
  hariIni: string,
): RingkasPerforma {
  if (!hariTagih) {
    return {
      hariIni: null,
      titik: [],
      rataRata: null,
      rataMurni: null,
      hariDinilai: 0,
      sorotan: { terbaik: null, terendah: null, hariTarget: 0 },
    };
  }
  const tagih = new Set(hariTagih);
  const baris = deret.filter((b) => b.tanggal <= hariIni && tagih.has(b.tanggal));
  // Hari tanpa patokan (0: tak ada angsuran jatuh tagih, lazim untuk mingguan dan tempoan)
  // tak jadi batang; patokan null (harian belum berpotret) tetap tampil sebagai tonggak kosong.
  const titik = baris
    .filter((b) => b.patokan !== 0)
    .map((b) => ({
      tanggal: b.tanggal,
      setoranMurni: b.setoranMurni,
      persentase: b.persentase,
      hariIni: b.tanggal === hariIni,
    }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  const dinilai = titik.filter((t) => !t.hariIni && t.persentase !== null);
  const lalu = dinilai.map((t) => t.persentase ?? 0);
  let terbaik: TitikPerforma | null = null;
  let terendah: TitikPerforma | null = null;
  for (const t of dinilai) {
    if (!terbaik || (t.persentase ?? 0) > (terbaik.persentase ?? 0)) terbaik = t;
    if (!terendah || (t.persentase ?? 0) < (terendah.persentase ?? 0)) terendah = t;
  }
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
    rataMurni:
      dinilai.length > 0
        ? Math.round(dinilai.reduce((a, t) => a + t.setoranMurni, 0) / dinilai.length)
        : null,
    hariDinilai: dinilai.length,
    sorotan: {
      terbaik,
      terendah,
      hariTarget: dinilai.filter((t) => Math.round(t.persentase ?? 0) >= 90).length,
    },
  };
}
