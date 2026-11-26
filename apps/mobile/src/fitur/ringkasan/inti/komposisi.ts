/**
 * KOMPOSISI & SELISIH — bahan bar bertumpuk di kartu Ringkasan dan tanda naik/turun
 * terhadap periode pembanding. Tanpa warna: komponen memetakan `urutan` (bagian ke-1, -2,
 * -3) ke token tema, terang atau di atas kartu sorot. PURE.
 */

export interface SegmenVM {
  label: string;
  /** 0–1 dari jumlah bagian. */
  porsi: number;
  /** "37%"; bagian kecil yang bukan nol "<1%", bukan "0%". Jumlah seluruh persen tepat 100. */
  persenTeks: string;
  /** Bagian ke berapa (0, 1, 2) — menentukan warna. */
  urutan: number;
}

/**
 * Persen bulat yang jumlahnya tepat 100 (metode sisa terbesar): tiap porsi dibulatkan ke
 * bawah, sisa poin dibagi ke pecahan terbesar. `Math.round` per bagian bisa mencetak
 * "51% · 50%".
 */
export function persenSisaTerbesar(porsi: readonly number[]): number[] {
  const mentah = porsi.map((p) => p * 100);
  const hasil = mentah.map(Math.floor);
  let sisa = 100 - hasil.reduce((t, n) => t + n, 0);
  const urut = mentah
    .map((m, i) => ({ i, pecahan: m - Math.floor(m) }))
    .sort((a, b) => b.pecahan - a.pecahan);
  for (const { i } of urut) {
    if (sisa <= 0) break;
    hasil[i] = (hasil[i] ?? 0) + 1;
    sisa--;
  }
  return hasil;
}

/** Bagian-bagian (negatif dianggap nol) → segmen; null bila semuanya nol (bar tak digambar). */
export function susunSegmen(
  bagian: readonly { label: string; nilai: number }[],
): SegmenVM[] | null {
  const bersih = bagian.map((b) => Math.max(0, b.nilai));
  const total = bersih.reduce((t, n) => t + n, 0);
  if (total <= 0) return null;
  const porsi = bersih.map((n) => n / total);
  const persen = persenSisaTerbesar(porsi);
  return bagian.map((b, i) => {
    const p = porsi[i] ?? 0;
    const pr = persen[i] ?? 0;
    return {
      label: b.label,
      porsi: p,
      persenTeks: p > 0 && pr === 0 ? "<1%" : `${pr}%`,
      urutan: i,
    };
  });
}

export interface SelisihVM {
  arah: "naik" | "turun" | "tetap";
  /** "12% dari Oktober 1–27" / "sama dengan pekan lalu" / "baru (Oktober 1–27 nol)". */
  teks: string;
}

/**
 * Perubahan `sekarang` terhadap `dulu` (periode pembanding sepadan). null bila keduanya
 * nol — tak ada yang dibandingkan.
 */
export function selisih(sekarang: number, dulu: number, label: string): SelisihVM | null {
  if (sekarang === 0 && dulu === 0) return null;
  if (sekarang === dulu) return { arah: "tetap", teks: `sama dengan ${label}` };
  const arah = sekarang > dulu ? "naik" : "turun";
  if (dulu <= 0) return { arah, teks: `${label}: Rp 0` };
  const persen = Math.round((Math.abs(sekarang - dulu) / dulu) * 100);
  return { arah, teks: `${persen < 1 ? "<1" : persen}% dari ${label}` };
}
