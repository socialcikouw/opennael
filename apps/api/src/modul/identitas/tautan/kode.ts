import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { ABJAD_KODE, PANJANG_KODE } from "@opennael/domain";

/**
 * Kode penautan acak: 31^8 ≈ 8,5 × 10^11 kemungkinan, berlaku 2 menit, dan
 * tebakan yang benar pun tak memberi apa-apa tanpa kunci klaim.
 */
export function buatKode(): string {
  let kode = "";
  for (let i = 0; i < PANJANG_KODE; i++) kode += ABJAD_KODE[randomInt(ABJAD_KODE.length)];
  return kode;
}

/** Kunci klaim acak (dipegang HP peminta) + hash-nya (disimpan server). */
export function buatKlaim(): { klaim: string; hash: string } {
  const klaim = randomBytes(32).toString("base64url");
  return { klaim, hash: hashKlaim(klaim) };
}

export const hashKlaim = (klaim: string) => createHash("sha256").update(klaim).digest("hex");

/** Perbandingan waktu-tetap. */
export function klaimCocok(klaim: string, hash: string): boolean {
  const a = Buffer.from(hashKlaim(klaim), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
