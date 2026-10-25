/**
 * Kode penautan HP (QR) — bentuk & pembakuan, tanpa keacakan (pembuatan kode
 * ada di server). Dipakai server, pemindai QR bos (aplikasi web), dan layar HP yang
 * meminta tautan.
 *
 * 8 karakter dari 31 huruf/angka yang tak mirip satu sama lain (tanpa 0/O,
 * 1/I/L) — diketik bos bila kamera bermasalah, jadi harus mudah dibaca.
 */
export const ABJAD_KODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const PANJANG_KODE = 8;
/** Isi QR: skema aplikasi + kode, supaya pemindai menolak QR lain. */
export const AWALAN_QR = "opennael://tautan/";

/** "K7QM28XD" → "K7QM-28XD" (tampilan). */
export function tampilanKode(kode: string): string {
  return `${kode.slice(0, PANJANG_KODE / 2)}-${kode.slice(PANJANG_KODE / 2)}`;
}

/** Isi QR untuk kode baku. */
export function isiQr(kode: string): string {
  return `${AWALAN_QR}${kode}`;
}

/**
 * Ketikan bos ("k7qm-28xd", spasi) atau isi QR utuh → kode baku; `null` bila
 * jelas bukan kode penautan.
 */
export function bakukanKode(masukan: string): string | null {
  let s = masukan.trim();
  if (s.toLowerCase().startsWith(AWALAN_QR)) s = s.slice(AWALAN_QR.length);
  s = s.toUpperCase().replace(/[\s-]/g, "");
  if (s.length !== PANJANG_KODE) return null;
  for (const c of s) if (!ABJAD_KODE.includes(c)) return null;
  return s;
}
