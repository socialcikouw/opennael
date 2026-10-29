import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { pinjaman, statusPinjamanEnum } from "./pinjaman";

/**
 * RIWAYAT STATUS PINJAMAN — satu baris per perpindahan `pinjaman.status`,
 * termasuk kelahirannya. DIISI TRIGGER `pinjaman_riwayat_status`, bukan
 * kode aplikasi — tak satu pun jalur perubahan status bisa lupa mencatat.
 * Hanya bertambah. Lihat docs/skema/schema-riwayat-status-pinjaman.md.
 */
export const riwayatStatusPinjaman = pgTable(
  "riwayat_status_pinjaman",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    pinjamanId: uuid().notNull(),
    /** Kosong = baris kelahiran pinjaman. */
    statusSebelum: statusPinjamanEnum(),
    statusSesudah: statusPinjamanEnum().notNull(),
    /** Hari pembukuan perpindahan. */
    tanggal: date({ mode: "string" }).notNull(),
    /** `clock_timestamp()`: kelahiran & perpindahan dalam satu transaksi tetap berurutan. */
    dibuatAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    foreignKey({
      name: "riwayat_status_pinjaman_kantor_fk",
      columns: [t.kantorId],
      foreignColumns: [kantor.id],
    }),
    foreignKey({
      name: "riwayat_status_pinjaman_pinjaman_fk",
      columns: [t.pinjamanId, t.kantorId],
      foreignColumns: [pinjaman.id, pinjaman.kantorId],
    }),
    uniqueIndex("uniq_riwayat_status_pinjaman_lahir")
      .on(t.pinjamanId)
      .where(sql`${t.statusSebelum} IS NULL`),
    index("idx_riwayat_status_pinjaman_pinjaman").on(t.pinjamanId, t.dibuatAt),
    check(
      "riwayat_status_pinjaman_urutan_check",
      sql`(${t.statusSebelum} IS NULL AND ${t.statusSesudah} = 'berjalan')
        OR (${t.statusSebelum} IS NOT NULL AND ${t.statusSebelum} <> ${t.statusSesudah})`,
    ),
  ],
);
