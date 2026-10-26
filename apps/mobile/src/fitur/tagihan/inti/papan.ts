/**
 * PAPAN TOMBOL layar transaksi. PURE. Dua tombol fungsi sama di setiap papan:
 * C (kosongkan) dan ⌫ (mundur satu langkah).
 *
 * - BAYAR: papan angka — nominal disimpan sebagai deret digit. Nol di depan
 *   tak pernah masuk (0 / 00 / 000 pada layar kosong diabaikan), panjangnya
 *   dibatasi supaya angka tak meluap dari layar.
 * - GULUNG: papan pokok — setiap tombol MENAMBAH nominalnya (100k diketuk
 *   dua kali = Rp 200.000). Ketukan disimpan berurutan, jadi ⌫ membatalkan
 *   ketukan terakhir. Pokok selalu kelipatan Rp 100.000 (A1).
 */
export const KOSONGKAN = "C";
export const MUNDUR = "⌫";

export type Papan = readonly (readonly string[])[];

// ---- bayar --------------------------------------------------------------

/** Rp 9.999.999.999 — jauh di atas saldo pinjaman mana pun. */
export const DIGIT_MAKS = 10;

export const PAPAN_BAYAR: Papan = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["0", "00", "000"],
  [KOSONGKAN, MUNDUR],
];

export function tekanBayar(digit: string, kunci: string): string {
  if (kunci === KOSONGKAN) return "";
  if (kunci === MUNDUR) return digit.slice(0, -1);
  if (digit === "" && kunci.startsWith("0")) return digit;
  return (digit + kunci).slice(0, DIGIT_MAKS);
}

export const nilaiDigit = (digit: string) => (digit === "" ? 0 : Number(digit));

// ---- gulung -------------------------------------------------------------

/** Rp 1 miliar — batas atas wajar pokok satu pinjaman di papan. */
export const POKOK_MAKS = 1_000_000_000;

export const PAPAN_POKOK: Papan = [
  ["100k", "200k", "300k"],
  ["400k", "500k", "600k"],
  ["700k", "800k", "900k"],
  [KOSONGKAN, "1000k", MUNDUR],
];

/** "300k" → 300.000. */
const nilaiKunci = (kunci: string) => Number(kunci.slice(0, -1)) * 1000;

export const jumlahKetukan = (ketukan: readonly number[]) => ketukan.reduce((a, b) => a + b, 0);

export function tekanPokok(ketukan: readonly number[], kunci: string): readonly number[] {
  if (kunci === KOSONGKAN) return [];
  if (kunci === MUNDUR) return ketukan.slice(0, -1);
  const n = nilaiKunci(kunci);
  if (jumlahKetukan(ketukan) + n > POKOK_MAKS) return ketukan;
  return [...ketukan, n];
}
