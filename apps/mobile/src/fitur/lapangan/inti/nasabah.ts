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
