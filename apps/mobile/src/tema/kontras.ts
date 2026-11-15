/**
 * KONTRAS WARNA (WCAG 2.x) — murni, tanpa ketergantungan. Dipakai uji tema
 * (`token.test.ts`) untuk menjaga keterbacaan: aplikasi dipakai kolektor di bawah
 * matahari, dan layar gelap lebih sulit dibaca di sana.
 */

function kanal(nilai: number): number {
  const c = nilai / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Hex `#rgb` / `#rrggbb` → [r, g, b] (0–255). */
export function bacaHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const penuh =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(penuh)) throw new Error(`Bukan hex warna: ${hex}`);
  return [0, 2, 4].map((i) => Number.parseInt(penuh.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

/** Luminans relatif 0 (hitam) … 1 (putih). */
export function luminans(hex: string): number {
  const [r, g, b] = bacaHex(hex);
  return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
}

/** Rasio kontras 1 … 21 antara dua warna hex. */
export function rasioKontras(a: string, b: string): number {
  const [terang, gelap] = [luminans(a), luminans(b)].sort((x, y) => y - x) as [number, number];
  return (terang + 0.05) / (gelap + 0.05);
}
