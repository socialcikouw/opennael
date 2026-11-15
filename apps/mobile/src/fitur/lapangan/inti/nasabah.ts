/**
 * LOGIKA MURNI detail nasabah di HP kolektor — urutan pinjaman, foto utama,
 * dan tautan telepon/peta. Tanpa React & I/O (diuji `bun test`).
 */

interface BahanPinjaman {
  status: string;
  pinjamanKe: number;
  fotoSerahTerimaId: string | null;
}

const AKTIF = new Set(["berjalan", "macet"]);

/** Pinjaman yang masih berjalan atau macet. */
export const pinjamanAktif = (p: { status: string }): boolean => AKTIF.has(p.status);

/** Yang aktif dulu, lalu yang selesai; di tiap kelompok `pinjamanKe` menurun (terbaru di atas). */
export function urutPinjaman<T extends { status: string; pinjamanKe: number }>(
  daftar: readonly T[],
): T[] {
  return [...daftar].sort(
    (a, b) => Number(pinjamanAktif(b)) - Number(pinjamanAktif(a)) || b.pinjamanKe - a.pinjamanKe,
  );
}

/**
 * Foto utama nasabah = foto serah terima pinjaman TERBARU yang punya foto
 * (schema-foto: foto profil diturunkan dari foto serah terima terakhir).
 * Pinjaman batal tak dihitung; salinan buku lama tak punya foto.
 */
export function fotoTerbaru(daftar: readonly BahanPinjaman[]): string | null {
  const ada = daftar.filter((p) => p.status !== "batal" && p.fotoSerahTerimaId !== null);
  const terbaru = ada.reduce<BahanPinjaman | null>(
    (t, p) => (t === null || p.pinjamanKe > t.pinjamanKe ? p : t),
    null,
  );
  return terbaru?.fotoSerahTerimaId ?? null;
}

/** Tautan peta ke titik rumah — membuka aplikasi peta di HP, atau peramban bila tak ada. */
export function tautanPeta(lokasi: { latitude: number; longitude: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${lokasi.latitude},${lokasi.longitude}`;
}

/** Tautan `tel:` dari nomor yang diketik apa adanya ("0812-3456 789" → `tel:08123456789`). */
export function tautanTelepon(nomor: string): string {
  return `tel:${nomor.replace(/[^\d+]/g, "")}`;
}

/**
 * Nomor untuk WhatsApp: hanya angka dengan kode negara ("+62 812-3456" → `628123456`,
 * "0812…" → `62812…`). `null` bila tak masuk akal sebagai nomor (8–15 digit, aturan E.164).
 */
export function nomorWhatsApp(nomor: string): string | null {
  const angka = nomor.replace(/\D/g, "");
  const lengkap = angka.startsWith("0") ? `62${angka.slice(1)}` : angka;
  return lengkap.length >= 8 && lengkap.length <= 15 ? lengkap : null;
}

/** Tautan yang langsung membuka aplikasi WhatsApp ke percakapan dengan nomor itu. */
export function tautanWhatsApp(nomorLengkap: string): string {
  return `whatsapp://send?phone=${nomorLengkap}`;
}

/** Cadangan bila aplikasi WhatsApp tak terpasang: tautan web (membuka peramban / toko aplikasi). */
export function tautanWhatsAppWeb(nomorLengkap: string): string {
  return `https://wa.me/${nomorLengkap}`;
}

/** Jumlah sisa saldo pinjaman yang masih aktif (berjalan, macet) — "Sisa Pinjaman" di detail nasabah. */
export function saldoAktif(daftar: readonly { status: string; saldo: number }[]): number {
  return daftar.filter(pinjamanAktif).reduce((jumlah, p) => jumlah + p.saldo, 0);
}

/**
 * Hutang nasabah = sisa saldo pinjaman − tabungannya (tabungan ikut melunasi saat lunas).
 * Tak pernah minus: tabungan yang melebihi saldo berarti tak ada hutang (0), bukan hutang negatif.
 */
export function hutangNasabah(sisaSaldo: number, tabungan: number): number {
  return Math.max(0, sisaSaldo - tabungan);
}
