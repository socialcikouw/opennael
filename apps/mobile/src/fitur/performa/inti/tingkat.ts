/**
 * TINGKAT PERFORMA (persentase tagihan murni ÷ patokan, aturan-usaha N) — lima tingkat dari
 * aplikasi lama (ditetapkan pemilik 2 Sep 2026, dipakai lagi saat Performa dirombak 27 Nov
 * 2026). Dibaca pada angka yang DIBULATKAN, sama dengan yang tercetak di layar (45,6% tampil
 * "46%" → Buruk, bukan Rusak). Warna dipetakan komponen ke token tema. PURE.
 *
 *   > 100   Luar Biasa  — melampaui patokan, di luar skala warna (tinta)
 *   90–100  Sempurna
 *   70–89   Baik
 *   46–69   Buruk
 *   ≤ 45    Rusak
 *   null    Belum Ada   — belum ada patokan / bukan hari tagih
 */

export type KunciTingkat = "luar-biasa" | "sempurna" | "baik" | "buruk" | "rusak" | "kosong";

export interface Tingkat {
  kunci: KunciTingkat;
  label: string;
}

const AMBANG: readonly { min: number; kunci: KunciTingkat; label: string }[] = [
  { min: 101, kunci: "luar-biasa", label: "Luar Biasa" },
  { min: 90, kunci: "sempurna", label: "Sempurna" },
  { min: 70, kunci: "baik", label: "Baik" },
  { min: 46, kunci: "buruk", label: "Buruk" },
  { min: Number.NEGATIVE_INFINITY, kunci: "rusak", label: "Rusak" },
];

export function tingkatDari(persentase: number | null): Tingkat {
  if (persentase === null) return { kunci: "kosong", label: "Belum Ada" };
  const bulat = Math.round(persentase);
  const t = AMBANG.find((a) => bulat >= a.min) ?? AMBANG[AMBANG.length - 1];
  return { kunci: t?.kunci ?? "rusak", label: t?.label ?? "Rusak" };
}

/** Lima tingkat untuk legenda, dari tertinggi: label + rentang ("90–100%"). */
export const LEGENDA_TINGKAT: readonly (Tingkat & { rentang: string })[] = AMBANG.map((a, i) => {
  const atas = AMBANG[i - 1];
  return {
    kunci: a.kunci,
    label: a.label,
    rentang:
      i === 0
        ? `>${a.min - 1}%`
        : !Number.isFinite(a.min)
          ? `≤${(atas?.min ?? 1) - 1}%`
          : `${a.min}–${(atas?.min ?? 1) - 1}%`,
  };
});
