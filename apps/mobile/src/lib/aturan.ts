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
