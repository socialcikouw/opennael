/** Saringan pencarian rute: tanggal `YYYY-MM-DD` yang sah atau tidak ada. */
export function tanggalSah(nilai: unknown): string | undefined {
  return typeof nilai === "string" && /^\d{4}-\d{2}-\d{2}$/.test(nilai) ? nilai : undefined;
}

/** Saringan pencarian rute: teks tak kosong atau tidak ada. */
export function teksSah(nilai: unknown): string | undefined {
  return typeof nilai === "string" && nilai.length > 0 ? nilai : undefined;
}

/** Saringan tanggal bersama — semua kunci opsional supaya tautan tanpa `search` tetap sah. */
export const saringTanggal = (s: Record<string, unknown>): { tanggal?: string } => ({
  tanggal: tanggalSah(s.tanggal),
});
