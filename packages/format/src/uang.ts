const ribuan = new Intl.NumberFormat("id-ID");

/** `1234567` → `Rp 1.234.567`; negatif → `−Rp 1.234.567`. */
export function rupiah(n: number): string {
  return `${n < 0 ? "−" : ""}Rp ${ribuan.format(Math.abs(n))}`;
}

/** Angka polos berpemisah ribuan. */
export function angka(n: number): string {
  return ribuan.format(n);
}

const satuDesimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** Persentase satu desimal: `90` → `90%`, `87.25` → `87,3%`. */
export function persen(n: number): string {
  return `${satuDesimal.format(n)}%`;
}

/** Ketikan uang → angka (hanya digit; kosong = 0). */
export function bacaUang(teks: string): number {
  const digit = teks.replace(/\D/g, "");
  return digit ? Number(digit) : 0;
}

/** Angka → ketikan uang berpemisah ribuan ("" bila 0). */
export function tulisUang(n: number): string {
  return n ? ribuan.format(n) : "";
}
