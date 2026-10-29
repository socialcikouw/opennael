import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { jejakWaktu, waktu } from "./kolom";
import { pengguna } from "./pengguna";

export const statusAbsensiEnum = pgEnum("status_absensi", ["masuk_kerja", "tidak_kerja"]);

const rupiah = () => bigint({ mode: "number" });

/**
 * HARI KOLEKTOR — satu kolektor pada satu hari: absensi pagi, dana yang
 * dibawa ke lapangan, dan penanda laporan dibuka (operasi lapangan berhenti).
 * Serah terima kas sore ada di tabel `serah_terima_kas`.
 * Lihat docs/skema/schema-hari-kolektor.md.
 */
export const hariKolektor = pgTable(
  "hari_kolektor",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    kolektorId: uuid().notNull(),
    tanggal: date({ mode: "string" }).notNull(),
    absensi: statusAbsensiEnum().notNull(),
    alasanTidakKerja: varchar({ length: 100 }),
    /** Modal tunai yang dibawa ke lapangan (dari bos). */
    kasLapangan: rupiah().notNull().default(0),
    /** Uang operasional hari itu (bensin, makan). */
    uangJalan: rupiah().notNull().default(0),
    /** Laporan dibuka → operasi lapangan kolektor ini berhenti hari itu. */
    laporanDibukaAt: waktu(),
    /** Arsip sistem lama — tak pernah ditulis lagi. */
    transferLama: rupiah(),
    /** Arsip sistem lama — tak pernah ditulis lagi. */
    tekorLama: rupiah(),
    ...jejakWaktu(),
  },
  (t) => [
    foreignKey({
      name: "hari_kolektor_kantor_fk",
      columns: [t.kantorId],
      foreignColumns: [kantor.id],
    }),
    foreignKey({
      name: "hari_kolektor_kolektor_fk",
      columns: [t.kolektorId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kolektorKantorId],
    }),
    unique("uniq_hari_kolektor_kolektor_tanggal").on(t.kolektorId, t.tanggal),
    unique("uniq_hari_kolektor_id_kantor").on(t.id, t.kantorId),
    index("idx_hari_kolektor_kantor_tanggal").on(t.kantorId, t.tanggal),
    check(
      "hari_kolektor_absensi_check",
      sql`(${t.absensi} = 'masuk_kerja' AND ${t.alasanTidakKerja} IS NULL)
        OR (${t.absensi} = 'tidak_kerja' AND ${t.alasanTidakKerja} IS NOT NULL
          AND ${t.kasLapangan} = 0 AND ${t.uangJalan} = 0
          AND ${t.laporanDibukaAt} IS NULL AND ${t.transferLama} IS NULL)`,
    ),
    check(
      "hari_kolektor_nominal_check",
      sql`${t.kasLapangan} >= 0 AND ${t.uangJalan} >= 0
        AND (${t.transferLama} IS NULL OR ${t.transferLama} >= 0)
        AND (${t.tekorLama} IS NULL OR ${t.tekorLama} > 0)`,
    ),
  ],
);
