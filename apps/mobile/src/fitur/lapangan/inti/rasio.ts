import type { KartuTagih } from "@opennael/contracts";
import { belumDicatat } from "./belum-dicatat";

export interface RasioHariIni {
  /** Yang sudah membayar angsuran hari ini. */
  bayar: number;
  /** Yang diliburkan hari ini. */
  libur: number;
  /** Wajib ditagih hari ini tetapi belum dicatat (aturan-usaha B6). */
  sisa: number;
  /** bayar ÷ (bayar + libur), 0–100 bulat; null selama belum ada yang dicatat. */
  persen: number | null;
  /** Σ setoran angsuran yang dicatat hari ini (rupiah). */
  setoran: number;
}

/**
 * RASIO BAYAR hari ini atas semua pinjaman pegangan (ketiga jenis): bayar ÷
 * (bayar + libur), plus sisa wajib dan setoran. Yang bukan wajib hari ini tetap
 * dihitung bila hari ini sudah dicatat (mis. nasabah mingguan yang membayar
 * lebih awal).
 */
export function rasioHariIni(
  pinjaman: readonly Pick<KartuTagih, "jenis" | "tanggalAkad" | "hariIni">[],
  tanggal: string,
): RasioHariIni {
  let bayar = 0;
  let libur = 0;
  let setoran = 0;
  for (const p of pinjaman) {
    if (p.hariIni?.jenis === "angsuran") {
      bayar++;
      setoran += p.hariIni.storting;
    } else if (p.hariIni?.jenis === "libur") {
      libur++;
    }
  }
  const ditagih = bayar + libur;
  return {
    bayar,
    libur,
    sisa: belumDicatat(pinjaman, tanggal).length,
    persen: ditagih > 0 ? Math.round((bayar / ditagih) * 100) : null,
    setoran,
  };
}
