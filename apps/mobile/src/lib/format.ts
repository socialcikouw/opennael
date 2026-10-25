/** "Rp 1.250.000" (negatif: "−Rp 200.000"). */
export function rupiah(n: number): string {
  const teks = `Rp ${Math.abs(n).toLocaleString("id-ID")}`;
  return n < 0 ? `−${teks}` : teks;
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "2026-10-23" → "Jumat, 23 Okt 2026" (tanggal kantor, tanpa zona). */
export function tanggalPanjang(tanggal: string): string {
  const [t, b, h] = tanggal.split("-").map(Number) as [number, number, number];
  const hariPekan = new Date(Date.UTC(t, b - 1, h)).getUTCDay();
  return `${HARI[hariPekan]}, ${h} ${BULAN[b - 1]} ${t}`;
}

/** Waktu di jam HP → "26 Okt 04.55". */
export function waktuPendek(d: Date): string {
  const jam = String(d.getHours()).padStart(2, "0");
  const menit = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${jam}.${menit}`;
}

/** "2026-10-23" → "23 Okt". */
export function tanggalPendek(tanggal: string): string {
  const [, b, h] = tanggal.split("-").map(Number) as [number, number, number];
  return `${h} ${BULAN[b - 1]}`;
}

export const NAMA_JENIS = { harian: "Harian", mingguan: "Mingguan", tempoan: "Tempoan" } as const;

/** Satuan tenor per jenis (A2): harian & mingguan = kali bayar, tempoan = hari. */
export function namaTenor(jenis: keyof typeof NAMA_JENIS, tenor: number): string {
  return jenis === "tempoan" ? `${tenor} hari` : `${tenor}×`;
}

/** Ketikan uang → angka (hanya digit; kosong = 0). */
export function bacaUang(teks: string): number {
  const digit = teks.replace(/\D/g, "");
  return digit ? Number(digit) : 0;
}

/** Angka → ketikan uang berpemisah ribuan ("" bila 0). */
export function tulisUang(n: number): string {
  return n ? n.toLocaleString("id-ID") : "";
}

/** Pesan galat aturan dari packages/domain (pratinjau) — atau null bila lolos. */
export function cobaAturan<T>(
  hitung: () => T,
): { hasil: T; galat: null } | { hasil: null; galat: string } {
  try {
    return { hasil: hitung(), galat: null };
  } catch (e) {
    return { hasil: null, galat: (e as Error).message };
  }
}
