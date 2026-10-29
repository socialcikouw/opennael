import { expect } from "bun:test";
import postgres from "postgres";

/**
 * PEMBANTU UJI SKEMA — database sendiri yang menolak data salah (CHECK, FK,
 * UNIQUE, trigger), bukan hanya service. Tiap uji berjalan di SATU transaksi
 * yang dibatalkan di akhir (`Batalkan`): database pengembangan tidak berubah.
 *
 * Butuh `DATABASE_URL` Supabase pengembangan (`apps/api/.env`); tanpa itu
 * dilewati. Uji per tabel ada di `platform/db/skema/<tabel>.test.ts`.
 */
export { URL_DB } from "./bantu";

/** Dilempar di akhir uji untuk membatalkan transaksi. */
export class Batalkan extends Error {}

export type Tx = postgres.TransactionSql;

/** Pernyataan harus ditolak database dengan nama constraint itu. */
export async function tolak(tx: Tx, constraint: string, jalankan: (sp: Tx) => Promise<unknown>) {
  let galat: unknown;
  try {
    await tx.savepoint((sp) => jalankan(sp as unknown as Tx));
  } catch (e) {
    galat = e;
  }
  expect(galat, `harus ditolak ${constraint}`).toBeInstanceOf(postgres.PostgresError);
  expect((galat as postgres.PostgresError).constraint_name).toBe(constraint);
}
