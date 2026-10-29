import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { jejakWaktu } from "./kolom";
import { pengguna } from "./pengguna";
import { wilayah } from "./wilayah";

/**
 * RUTE KOLEKTOR — kepala rute satu kolektor: penjaga `versi` (naik setiap
 * penyimpanan) dan siapa yang terakhir menyimpan. Diatur dua pihak (kolektor
 * & bos), jadi penyimpan wajib menyebut versi yang terakhir ia baca.
 * Lihat docs/skema/schema-rute.md.
 */
export const ruteKolektor = pgTable(
  "rute_kolektor",
  {
    kolektorId: uuid().primaryKey(),
    kantorId: uuid().notNull(),
    versi: integer().notNull().default(1),
    diubahOleh: uuid(),
    ...jejakWaktu(),
  },
  (t) => [
    foreignKey({
      name: "rute_kolektor_kolektor_fk",
      columns: [t.kolektorId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kolektorKantorId],
    }),
    foreignKey({
      name: "rute_kolektor_diubah_oleh_fk",
      columns: [t.diubahOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    unique("uniq_rute_kolektor_kolektor_kantor").on(t.kolektorId, t.kantorId),
    check("rute_kolektor_versi_check", sql`${t.versi} >= 1`),
  ],
);

/**
 * RUTE WILAYAH — satu kampung dalam rute seorang kolektor beserta nomor
 * urutnya (1 = Rute 1). Disimpan utuh sekali jalan (hapus lalu tulis ulang);
 * kampung yang masih di rute tak bisa dihapus (FK tanpa cascade).
 */
export const ruteWilayah = pgTable(
  "rute_wilayah",
  {
    kolektorId: uuid().notNull(),
    kantorId: uuid().notNull(),
    wilayahId: uuid().notNull(),
    urutan: smallint().notNull(),
  },
  (t) => [
    primaryKey({ name: "rute_wilayah_pkey", columns: [t.kolektorId, t.wilayahId] }),
    foreignKey({
      name: "rute_wilayah_rute_fk",
      columns: [t.kolektorId, t.kantorId],
      foreignColumns: [ruteKolektor.kolektorId, ruteKolektor.kantorId],
    }).onDelete("cascade"),
    foreignKey({
      name: "rute_wilayah_wilayah_fk",
      columns: [t.wilayahId, t.kantorId],
      foreignColumns: [wilayah.id, wilayah.kantorId],
    }),
    unique("uniq_rute_wilayah_urutan").on(t.kolektorId, t.urutan),
    index("idx_rute_wilayah_wilayah").on(t.wilayahId),
    check("rute_wilayah_urutan_check", sql`${t.urutan} >= 1`),
  ],
);
