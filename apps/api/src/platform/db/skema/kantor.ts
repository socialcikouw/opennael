import { sql } from "drizzle-orm";
import { check, date, pgEnum, pgTable, time, uuid, varchar } from "drizzle-orm/pg-core";
import { jejakWaktu } from "./kolom";

/** Zona Indonesia — offset tetap tanpa jam musim panas. */
export const zonaWaktuEnum = pgEnum("zona_waktu", ["WIB", "WITA", "WIT"]);

/**
 * KANTOR — tenant: profil, kalender (zona & jam), status penjadwal. Tanpa FK
 * keluar: semua pengguna (termasuk bos) dan data bisnis menunjuk ke sini.
 * Pekan kerja ada di `pekan_kerja` (bertanggal). Lihat docs/skema/schema-kantor.md.
 */
export const kantor = pgTable(
  "kantor",
  {
    id: uuid().primaryKey().defaultRandom(),
    nama: varchar({ length: 100 }).notNull(),
    zonaWaktu: zonaWaktuEnum().notNull().default("WIB"),
    /** Awal jam operasi lapangan (waktu kantor). */
    jamBuka: time().notNull().default("07:00"),
    /** Akhir jam operasi, eksklusif; `24:00` = tengah malam. */
    jamTutup: time().notNull().default("24:00"),
    /** Hari terakhir yang sudah disapu tutup hari. NULL = belum pernah. */
    tanggalTutupTerakhir: date({ mode: "string" }),
    ...jejakWaktu(),
  },
  (t) => [check("kantor_jam_check", sql`${t.jamBuka} < ${t.jamTutup}`)],
);
