import { sql } from "drizzle-orm";
import { check, foreignKey, pgTable, text, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { jejakWaktu } from "./kolom";
import { pengguna } from "./pengguna";

/**
 * WILAYAH — satu kampung (dusun, perumahan, pasar) di satu kantor dengan satu
 * nama baku; satu-satunya tempat nama kampung tersimpan. Ganti nama = satu
 * baris; gabung = pindahkan nasabah & rute lalu hapus yang lama. Kampung
 * baru lahir dari formulir nasabah. Lihat docs/skema/schema-wilayah.md.
 */
export const wilayah = pgTable(
  "wilayah",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    /** Nama baku, spasi rapi (`rapikanNamaWilayah` di packages/domain). */
    nama: varchar({ length: 50 }).notNull(),
    /** Pembanding "kampung yang sama" — kembar dengan `kunciWilayah` di packages/domain. */
    kunci: text()
      .notNull()
      .generatedAlwaysAs(sql`lower(btrim(regexp_replace(nama, '\\s+', ' ', 'g')))`),
    /** Orang yang memperkenalkan kampung ini (lewat formulir nasabah). */
    dibuatOleh: uuid().notNull(),
    ...jejakWaktu(),
  },
  (t) => [
    foreignKey({ name: "wilayah_kantor_fk", columns: [t.kantorId], foreignColumns: [kantor.id] }),
    foreignKey({
      name: "wilayah_dibuat_oleh_fk",
      columns: [t.dibuatOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    unique("uniq_wilayah_kantor_kunci").on(t.kantorId, t.kunci),
    unique("uniq_wilayah_id_kantor").on(t.id, t.kantorId),
    check(
      "wilayah_nama_check",
      sql`${t.nama} <> '' AND ${t.nama} = btrim(regexp_replace(${t.nama}, '\\s+', ' ', 'g'))`,
    ),
  ],
);
