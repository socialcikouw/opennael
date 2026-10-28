import { sql } from "drizzle-orm";
import { check, foreignKey, jsonb, pgTable, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { waktu } from "./kolom";
import { pengguna } from "./pengguna";

/** Hasil operasi atomik — docs/skema/schema-operasi-idempoten.md. */
export const operasiIdempoten = pgTable(
  "operasi_idempoten",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    penggunaId: uuid().notNull(),
    kunci: uuid().notNull(),
    operasi: varchar({ length: 120 }).notNull(),
    sidikIsi: varchar({ length: 64 }).notNull(),
    hasil: jsonb().notNull(),
    dibuatAt: waktu().notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "operasi_idempoten_kantor_fk",
      columns: [t.kantorId],
      foreignColumns: [kantor.id],
    }),
    foreignKey({
      name: "operasi_idempoten_pengguna_kantor_fk",
      columns: [t.penggunaId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    unique("uniq_operasi_idempoten_pelaku_kunci").on(t.kantorId, t.penggunaId, t.kunci),
    check("operasi_idempoten_operasi_check", sql`length(trim(${t.operasi})) > 0`),
    check("operasi_idempoten_sidik_isi_check", sql`${t.sidikIsi} ~ '^[0-9a-f]{64}$'`),
  ],
);
