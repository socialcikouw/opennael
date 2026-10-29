import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { waktu } from "./kolom";
import { pengguna } from "./pengguna";

export const platformPerangkatEnum = pgEnum("platform_perangkat", ["android", "ios", "web"]);

export const alasanPutusEnum = pgEnum("alasan_putus", [
  "keluar",
  "diputus",
  "ganti_sandi",
  "tautan_baru",
  "dinonaktifkan",
  "pakai_ulang",
  "kedaluwarsa",
]);

/**
 * PERANGKAT — satu baris = satu HP/browser yang login atas nama satu akun.
 * Refresh token TIDAK disimpan: token `pr1.<id>.<putaran>.<mac>` dibuat ulang
 * dari `id` + `putaran` + rahasia server. Lihat docs/skema/schema-perangkat.md.
 */
export const perangkat = pgTable(
  "perangkat",
  {
    id: uuid().primaryKey().defaultRandom(),
    penggunaId: uuid().notNull(),
    /** Salinan `pengguna.kantor_id` — dijaga FK gabungan. */
    kantorId: uuid().notNull(),
    nama: varchar({ length: 100 }),
    platform: platformPerangkatEnum(),
    /** Nomor rotasi refresh token yang sedang berlaku. */
    putaran: integer().notNull().default(1),
    kedaluwarsaAt: waktu().notNull(),
    terakhirAktifAt: waktu().notNull().defaultNow(),
    diputusAt: waktu(),
    /** NULL bila diputus sistem (`pakai_ulang`, `kedaluwarsa`). */
    diputusOleh: uuid(),
    alasanPutus: alasanPutusEnum(),
    dibuatAt: waktu().notNull().defaultNow(),
  },
  (t) => [
    foreignKey({ name: "perangkat_kantor_fk", columns: [t.kantorId], foreignColumns: [kantor.id] }),
    foreignKey({
      name: "perangkat_pengguna_fk",
      columns: [t.penggunaId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "perangkat_diputus_oleh_fk",
      columns: [t.diputusOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    index("idx_perangkat_pengguna_aktif").on(t.penggunaId).where(sql`${t.diputusAt} IS NULL`),
    index("idx_perangkat_kantor_aktif").on(t.kantorId).where(sql`${t.diputusAt} IS NULL`),
    check("perangkat_putaran_check", sql`${t.putaran} >= 1`),
    check(
      "perangkat_putus_check",
      sql`(${t.diputusAt} IS NULL AND ${t.diputusOleh} IS NULL AND ${t.alasanPutus} IS NULL)
        OR (${t.diputusAt} IS NOT NULL AND ${t.alasanPutus} IS NOT NULL
          AND (${t.alasanPutus} IN ('pakai_ulang', 'kedaluwarsa')) = (${t.diputusOleh} IS NULL))`,
    ),
  ],
);
