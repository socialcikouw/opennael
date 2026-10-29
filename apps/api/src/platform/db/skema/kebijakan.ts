import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { jejakWaktu } from "./kolom";
import { nasabah } from "./nasabah";
import { pengguna } from "./pengguna";

/**
 * KEBIJAKAN — rem operasional bos, tiga lapis menurut kolom sasaran:
 * keduanya kosong = kantor; `kolektor_id` = satu kolektor; `nasabah_id` =
 * satu nasabah. TANPA BARIS = TERBUKA: tabel hanya berisi rem yang sedang
 * menyala (baris dengan semua saklar mati dihapus, dijaga CHECK).
 * Lihat docs/skema/schema-kebijakan.md.
 */
export const kebijakan = pgTable(
  "kebijakan",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    kolektorId: uuid(),
    nasabahId: uuid(),
    /** Semua akad baru (orang baru & pinjam lagi). */
    pinjamanBaruDikunci: boolean().notNull().default(false),
    /** Gulung yang menaikkan pokok. */
    naikPinjamanDikunci: boolean().notNull().default(false),
    /** Semua gulung. */
    gulungPinjamanDikunci: boolean().notNull().default(false),
    /** Tercetak di pesan penolakan ke kolektor. */
    alasanKunci: varchar({ length: 100 }),
    /** Bos yang terakhir menekan toggle. */
    diubahOleh: uuid().notNull(),
    ...jejakWaktu(),
  },
  (t) => [
    foreignKey({ name: "kebijakan_kantor_fk", columns: [t.kantorId], foreignColumns: [kantor.id] }),
    foreignKey({
      name: "kebijakan_kolektor_fk",
      columns: [t.kolektorId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kolektorKantorId],
    }),
    foreignKey({
      name: "kebijakan_nasabah_fk",
      columns: [t.nasabahId, t.kantorId],
      foreignColumns: [nasabah.id, nasabah.kantorId],
    }),
    foreignKey({
      name: "kebijakan_diubah_oleh_fk",
      columns: [t.diubahOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    uniqueIndex("uniq_kebijakan_kantor")
      .on(t.kantorId)
      .where(sql`${t.kolektorId} IS NULL AND ${t.nasabahId} IS NULL`),
    uniqueIndex("uniq_kebijakan_kolektor").on(t.kolektorId).where(sql`${t.kolektorId} IS NOT NULL`),
    uniqueIndex("uniq_kebijakan_nasabah").on(t.nasabahId).where(sql`${t.nasabahId} IS NOT NULL`),
    check("kebijakan_sasaran_check", sql`num_nonnulls(${t.kolektorId}, ${t.nasabahId}) <= 1`),
    // "Nasabah ini tak boleh pinjam lagi" adalah tugas blokir di `nasabah`.
    check(
      "kebijakan_lapis_nasabah_check",
      sql`${t.nasabahId} IS NULL OR ${t.pinjamanBaruDikunci} = false`,
    ),
    check(
      "kebijakan_menyala_check",
      sql`${t.pinjamanBaruDikunci} OR ${t.naikPinjamanDikunci} OR ${t.gulungPinjamanDikunci}`,
    ),
  ],
);
