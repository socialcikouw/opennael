import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { waktu } from "./kolom";
import { pengguna } from "./pengguna";

/**
 * BIAYA TAK TERDUGA — biaya lapangan seorang kolektor (service motor, ban
 * bocor) yang ditanggung kantor; dicatat kasir sore hari, keterangan wajib.
 * Mengurangi tunai yang seharusnya diserahkan hari itu. Terkunci sesudah kas
 * diterima (`biaya_tak_terduga_terkunci`). HANYA BERTAMBAH.
 * Lihat docs/skema/schema-biaya-tak-terduga.md.
 */
export const biayaTakTerduga = pgTable(
  "biaya_tak_terduga",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    kolektorId: uuid().notNull(),
    tanggal: date({ mode: "string" }).notNull(),
    nominal: bigint({ mode: "number" }).notNull(),
    keterangan: varchar({ length: 100 }).notNull(),
    dibuatOleh: uuid().notNull(),
    dibuatAt: waktu().notNull().defaultNow(),
    dibatalkanAt: waktu(),
    dibatalkanOleh: uuid(),
    alasanBatal: varchar({ length: 100 }),
  },
  (t) => [
    foreignKey({
      name: "biaya_tak_terduga_kolektor_fk",
      columns: [t.kolektorId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kolektorKantorId],
    }),
    foreignKey({
      name: "biaya_tak_terduga_dibuat_oleh_fk",
      columns: [t.dibuatOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "biaya_tak_terduga_dibatalkan_oleh_fk",
      columns: [t.dibatalkanOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    index("idx_biaya_tak_terduga_kolektor_tanggal").on(t.kolektorId, t.tanggal),
    index("idx_biaya_tak_terduga_kantor_tanggal").on(t.kantorId, t.tanggal),
    check("biaya_tak_terduga_nominal_check", sql`${t.nominal} > 0`),
    check("biaya_tak_terduga_keterangan_check", sql`length(btrim(${t.keterangan})) > 0`),
    check(
      "biaya_tak_terduga_batal_check",
      sql`(${t.dibatalkanAt} IS NULL AND ${t.dibatalkanOleh} IS NULL AND ${t.alasanBatal} IS NULL)
        OR (${t.dibatalkanAt} IS NOT NULL AND ${t.dibatalkanOleh} IS NOT NULL AND ${t.alasanBatal} IS NOT NULL)`,
    ),
  ],
);
