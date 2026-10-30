/** Bagian `crypto` yang dipakai — HP (Hermes) tak selalu punya semuanya. */
export interface SumberAcak {
  randomUUID?: () => string;
  getRandomValues?: (isi: Uint8Array<ArrayBuffer>) => unknown;
}

/**
 * UUID v4 untuk `Idempotency-Key`. Hermes (HP) tidak punya `crypto.randomUUID`
 * dan paket pembangkit acak native sengaja tidak dipasang (mengubah sidik jari
 * runtime), jadi dipakai `getRandomValues` bila ada, selain itu `Math.random`.
 * Kunci hanya perlu tak bertabrakan dengan kunci lain milik pengguna yang sama
 * — bukan rahasia — sehingga keacakan non-kriptografis cukup.
 */
export function buatUuid(sumber: SumberAcak | undefined = globalThis.crypto): string {
  if (typeof sumber?.randomUUID === "function") return sumber.randomUUID();
  const b = new Uint8Array(16);
  if (typeof sumber?.getRandomValues === "function") sumber.getRandomValues(b);
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40; // versi 4
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80; // varian RFC 4122
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
