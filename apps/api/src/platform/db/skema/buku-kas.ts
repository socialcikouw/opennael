import { sql } from "drizzle-orm";
import { check, date, foreignKey, pgTable, uuid } from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { rupiah, waktu } from "./kolom";
import { pengguna } from "./pengguna";

/**
 * BUKU KAS — satu kantor membuka buku kasnya: tanggal mulai & isi kas saat
 * itu. Titik nol laporan kas; tanpa baris ini mutasi, penarikan tabungan,
 * gaji, dan pencocokan ditolak (FK ke tabel ini). Kas awal hanya boleh
 * dibetulkan di hari pembukaan (dicatat di riwayat).
 * Lihat docs/skema/schema-buku-kas.md.
 */
export const bukuKas = pgTable(
  "buku_kas",
  {
    kantorId: uuid().primaryKey(),
    tanggalBuka: date({ mode: "string" }).notNull(),
    kasAwalTunai: rupiah().notNull().default(0),
    kasAwalBank: rupiah().notNull().default(0),
    dibukaOleh: uuid().notNull(),
    dibukaAt: waktu().notNull().defaultNow(),
    diubahAt: waktu().notNull().defaultNow(),
  },
  (t) => [
    foreignKey({ name: "buku_kas_kantor_fk", columns: [t.kantorId], foreignColumns: [kantor.id] }),
    foreignKey({
      name: "buku_kas_dibuka_oleh_fk",
      columns: [t.dibukaOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    check("buku_kas_nominal_check", sql`${t.kasAwalTunai} >= 0 AND ${t.kasAwalBank} >= 0`),
  ],
);
