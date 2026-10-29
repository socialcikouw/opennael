import { sql } from "drizzle-orm";
import { check, date, foreignKey, integer, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { jejakWaktu } from "./kolom";
import { pengguna } from "./pengguna";

/**
 * TARIF GAJI — basis poin atas storting (500 = 5%), BERTANGGAL, dua lapis:
 * `kolektor_id` kosong = tarif kantor (wajib ada sejak kantor dibuat);
 * terisi = tarif khusus kolektor, dan `tarif_bp` kosong di sana berarti
 * "kembali ikut tarif kantor". Tidak boleh mundur — trigger
 * `tarif_gaji_tidak_mundur`. Lihat docs/skema/schema-tarif-gaji.md.
 */
export const tarifGaji = pgTable(
  "tarif_gaji",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    kolektorId: uuid(),
    tarifBp: integer(),
    berlakuMulai: date({ mode: "string" }).notNull(),
    dibuatOleh: uuid().notNull(),
    ...jejakWaktu(),
  },
  (t) => [
    foreignKey({
      name: "tarif_gaji_kantor_fk",
      columns: [t.kantorId],
      foreignColumns: [kantor.id],
    }),
    foreignKey({
      name: "tarif_gaji_kolektor_fk",
      columns: [t.kolektorId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kolektorKantorId],
    }),
    foreignKey({
      name: "tarif_gaji_dibuat_oleh_fk",
      columns: [t.dibuatOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    // Dua UNIQUE parsial: NULL di unique index dianggap saling berbeda.
    uniqueIndex("uniq_tarif_gaji_kantor")
      .on(t.kantorId, t.berlakuMulai)
      .where(sql`${t.kolektorId} IS NULL`),
    uniqueIndex("uniq_tarif_gaji_kolektor")
      .on(t.kolektorId, t.berlakuMulai)
      .where(sql`${t.kolektorId} IS NOT NULL`),
    check(
      "tarif_gaji_tarif_check",
      sql`(${t.tarifBp} IS NULL AND ${t.kolektorId} IS NOT NULL)
        OR (${t.tarifBp} IS NOT NULL AND ${t.tarifBp} BETWEEN 0 AND 10000)`,
    ),
  ],
);
