/**
 * PAPAN ANGKA layar Bayar — nominal disimpan sebagai deret digit. PURE.
 * Nol di depan tak pernah masuk (0 / 00 / 000 pada layar kosong diabaikan),
 * dan panjangnya dibatasi supaya angka tak meluap dari layar.
 */
export type TombolPapan = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "0" | "00" | "000";

/** Rp 9.999.999.999 — jauh di atas saldo pinjaman mana pun. */
export const DIGIT_MAKS = 10;

export const BARIS_PAPAN: readonly (readonly TombolPapan[])[] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["0", "00", "000"],
];

export function ketik(digit: string, tombol: TombolPapan): string {
  if (digit === "" && tombol.startsWith("0")) return digit;
  return (digit + tombol).slice(0, DIGIT_MAKS);
}

export const hapusSatu = (digit: string) => digit.slice(0, -1);

export const nilaiDigit = (digit: string) => (digit === "" ? 0 : Number(digit));
