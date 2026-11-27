import { rupiah } from "@opennael/format";

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
  /** Arti perubahan: naik saldo = baik, naik macet = buruk (`naikBaik`). */
  nada: "baik" | "buruk" | "netral";
  /** "+Rp 250.000 (12%) vs akhir Oktober" / "−3 nasabah (8%) vs akhir Oktober" / "sama dengan …". */
  teks: string;
}

/**
 * Perubahan `sekarang` terhadap `dulu` (pembanding): besaran mutlak + persen. `naikBaik` false
 * untuk angka yang lebih baik bila turun (macet, macet baru). `satuan` diisi = hitungan
 * ("nasabah"), selain itu rupiah. null bila keduanya nol — tak ada yang dibandingkan.
 */
export function selisih(
  sekarang: number,
  dulu: number,
  label: string,
  opsi: { naikBaik?: boolean; satuan?: string } = {},
): SelisihVM | null {
  if (sekarang === 0 && dulu === 0) return null;
  if (sekarang === dulu) return { arah: "tetap", nada: "netral", teks: `sama dengan ${label}` };
  const arah = sekarang > dulu ? "naik" : "turun";
  const naikBaik = opsi.naikBaik ?? true;
  const nada = (arah === "naik") === naikBaik ? "baik" : "buruk";
  const beda = Math.abs(sekarang - dulu);
  const besaran = opsi.satuan ? `${beda.toLocaleString("id-ID")} ${opsi.satuan}` : rupiah(beda);
  const tanda = arah === "naik" ? "+" : "−";
  if (dulu <= 0) return { arah, nada, teks: `${tanda}${besaran} vs ${label}` };
  const persen = Math.round((beda / Math.abs(dulu)) * 100);
  return { arah, nada, teks: `${tanda}${besaran} (${persen < 1 ? "<1" : persen}%) vs ${label}` };
}
