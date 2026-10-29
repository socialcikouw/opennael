/**
 * Kata sandi bos — argon2id bawaan Bun (`Bun.password`), tanpa paket native.
 */
export const hashSandi = (sandi: string) => Bun.password.hash(sandi, { algorithm: "argon2id" });

export const cocokSandi = (sandi: string, hash: string) => Bun.password.verify(sandi, hash);

/**
 * Jalur "nomor tak terdaftar" ikut memverifikasi hash tiruan, supaya lamanya
 * sama dengan "sandi salah" — orang luar tak bisa menebak nomor mana yang
 * terdaftar dari waktu jawab.
 */
let hashTiruan: Promise<string> | undefined;
export async function samakanWaktu(sandi: string): Promise<void> {
  hashTiruan ??= hashSandi(crypto.randomUUID());
  await Bun.password.verify(sandi, await hashTiruan);
}
