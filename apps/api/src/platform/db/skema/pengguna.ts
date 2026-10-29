import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { jejakWaktu, waktu } from "./kolom";

export const peranPenggunaEnum = pgEnum("peran_pengguna", ["bos", "kasir", "pengawas", "kolektor"]);

/**
 * PENGGUNA — akun & peran. Semua peran, termasuk bos, ber-`kantor_id`. Akun
 * tidak pernah dihapus (data uang merujuknya); karyawan keluar dinonaktifkan.
 * Lihat docs/skema/schema-pengguna.md.
 */
export const pengguna = pgTable(
  "pengguna",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    peran: peranPenggunaEnum().notNull(),
    /** Nama tampil; tidak unik, bukan untuk login. */
    nama: varchar({ length: 50 }).notNull(),
    /** E.164 (`+62…`). Bos: kredensial login. Peran lain: kontak. */
    nomorHp: varchar({ length: 16 }),
    /** Hanya bos; peran lain masuk lewat tautan QR. */
    hashSandi: varchar({ length: 255 }),
    /** Label wilayah kerja kolektor — tampilan, bukan logika. */
    resort: varchar({ length: 50 }),
    /**
     * `= kantor_id` bila kolektor, selain itu NULL — sasaran FK
     * `(kolektor_id, kantor_id)` tabel bisnis: yang tercatat sebagai
     * kolektor pasti kolektor kantor itu.
     */
    kolektorKantorId: uuid().generatedAlwaysAs(
      sql`CASE WHEN peran = 'kolektor' THEN kantor_id END`,
    ),
    dinonaktifkanAt: waktu(),
    dinonaktifkanOleh: uuid(),
    alasanNonaktif: varchar({ length: 200 }),
    ...jejakWaktu(),
  },
  (t) => [
    foreignKey({ name: "pengguna_kantor_fk", columns: [t.kantorId], foreignColumns: [kantor.id] }),
    unique("uniq_pengguna_id_kantor").on(t.id, t.kantorId),
    unique("uniq_pengguna_id_kolektor_kantor").on(t.id, t.kolektorKantorId),
    foreignKey({
      name: "pengguna_dinonaktifkan_oleh_fk",
      columns: [t.dinonaktifkanOleh, t.kantorId],
      foreignColumns: [t.id, t.kantorId],
    }),
    // Satu bos aktif per kantor; bos lama yang dinonaktifkan tak menghalangi.
    uniqueIndex("uniq_pengguna_bos_kantor")
      .on(t.kantorId)
      .where(sql`${t.peran} = 'bos' AND ${t.dinonaktifkanAt} IS NULL`),
    // Kredensial login unik; nomor kontak peran lain boleh sama.
    uniqueIndex("uniq_pengguna_nomor_hp_bos")
      .on(t.nomorHp)
      .where(sql`${t.peran} = 'bos' AND ${t.dinonaktifkanAt} IS NULL`),
    index("idx_pengguna_kantor_peran").on(t.kantorId, t.peran),
    check(
      "pengguna_peran_check",
      sql`(${t.peran} = 'bos' AND ${t.nomorHp} IS NOT NULL AND ${t.hashSandi} IS NOT NULL)
        OR (${t.peran} <> 'bos' AND ${t.hashSandi} IS NULL)`,
    ),
    check("pengguna_resort_check", sql`${t.resort} IS NULL OR ${t.peran} = 'kolektor'`),
    check(
      "pengguna_nomor_hp_check",
      sql`${t.nomorHp} IS NULL OR ${t.nomorHp} ~ '^\\+[0-9]{8,15}$'`,
    ),
    check(
      "pengguna_nonaktif_check",
      sql`(${t.dinonaktifkanAt} IS NULL AND ${t.dinonaktifkanOleh} IS NULL AND ${t.alasanNonaktif} IS NULL)
        OR (${t.dinonaktifkanAt} IS NOT NULL AND ${t.dinonaktifkanOleh} IS NOT NULL AND ${t.alasanNonaktif} IS NOT NULL)`,
    ),
  ],
);
