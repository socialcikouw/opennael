import { sql } from "drizzle-orm";
import { check, date, foreignKey, pgTable, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { waktu } from "./kolom";
import { pengguna } from "./pengguna";

/**
 * LIBUR KANTOR — tanggal khusus kantor tutup (di luar pekan kerja). Tidak
 * boleh mengubah sejarah: hanya hari ini atau ke depan, dan tidak disunting
 * — trigger `libur_kantor_tidak_mundur`. Lihat docs/skema/schema-libur-kantor.md.
 */
export const liburKantor = pgTable(
  "libur_kantor",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    tanggal: date({ mode: "string" }).notNull(),
    alasanLibur: varchar({ length: 100 }).notNull(),
    dibuatOleh: uuid().notNull(),
    dibuatAt: waktu().notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "libur_kantor_kantor_fk",
      columns: [t.kantorId],
      foreignColumns: [kantor.id],
    }),
    foreignKey({
      name: "libur_kantor_dibuat_oleh_fk",
      columns: [t.dibuatOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    unique("uniq_libur_kantor_kantor_tanggal").on(t.kantorId, t.tanggal),
    check("libur_kantor_alasan_check", sql`length(btrim(${t.alasanLibur})) > 0`),
  ],
);
