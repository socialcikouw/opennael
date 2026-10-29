import type { PgDatabase } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as skema from "./skema";

/**
 * Satu koneksi per proses. `prepare: false` wajib untuk pooler mode transaksi
 * (Supabase port 6543) dan tak merugikan Postgres VPS.
 */
export function buatDb(databaseUrl: string) {
  const sql = postgres(databaseUrl, { prepare: false, max: 10, onnotice: () => {} });
  return { db: drizzle(sql, { schema: skema, casing: "snake_case" }), sql };
}

/**
 * Database ATAU transaksi — layanan menerima keduanya, sehingga uji bisa
 * menjalankan seluruh API di dalam satu transaksi yang dibatalkan.
 */
export type Db = PgDatabase<PostgresJsQueryResultHKT, typeof skema>;
