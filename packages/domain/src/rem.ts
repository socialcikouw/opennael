/**
 * REM BOS YANG BERLAKU — gabungan lapis `kebijakan` (kantor, kolektor,
 * nasabah) untuk satu kolektor & nasabah. Satu lapis yang mengunci cukup;
 * alasan diambil dari lapis paling spesifik yang mengunci saklar itu.
 * Docs: schema-kebijakan.md.
 */
export interface BarisRem {
  kolektorId: string | null;
  nasabahId: string | null;
  pinjamanBaru: boolean;
  naik: boolean;
  gulung: boolean;
  alasan: string | null;
}

export type SaklarRem = "pinjamanBaru" | "naik" | "gulung";

export function gabungRem(
  baris: readonly BarisRem[],
  sasaran: { kolektorId: string; nasabahId: string | null },
) {
  const berlaku = baris.filter(
    (r) =>
      (r.kolektorId === null && r.nasabahId === null) ||
      r.kolektorId === sasaran.kolektorId ||
      (sasaran.nasabahId !== null && r.nasabahId === sasaran.nasabahId),
  );
  // Urut paling spesifik dulu: nasabah, kolektor, kantor.
  const tingkat = (r: BarisRem) => (r.nasabahId ? 2 : r.kolektorId ? 1 : 0);
  const urut = [...berlaku].sort((a, b) => tingkat(b) - tingkat(a));
  return {
    // Lapis nasabah tak punya saklar pinjaman baru (blokir yang mengurusnya).
    pinjamanBaru: berlaku.some((r) => r.pinjamanBaru && !r.nasabahId),
    naik: berlaku.some((r) => r.naik),
    gulung: berlaku.some((r) => r.gulung),
    alasan: (saklar: SaklarRem) => urut.find((r) => r[saklar])?.alasan ?? null,
  };
}
