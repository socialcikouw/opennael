import { sql } from "drizzle-orm";
import { check, date, foreignKey, index, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { bukuKas } from "./buku-kas";
import { rupiah, waktu } from "./kolom";
import { akunKasEnum } from "./mutasi-kas-kantor";
import { pengguna } from "./pengguna";

/**
 * PEMBAYARAN GAJI — gaji seorang kolektor untuk satu periode yang sudah
 * berakhir. Gaji kotor (Σ storting × tarif harian) dan potongan tekor (dari
 * serah terima kas + arsip tekor lama) DIBEKUKAN di sini saat dibayar; slip
 * tak pernah bergeser. Periode berlaku tak mungkin tumpang tindih (EXCLUDE
 * `pembayaran_gaji_periode_excl`, migrasi kustom). Kas keluar — FK ke buku
 * kas. HANYA BERTAMBAH. Lihat docs/skema/schema-pembayaran-gaji.md.
 */
export const pembayaranGaji = pgTable(
  "pembayaran_gaji",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    kolektorId: uuid().notNull(),
    periodeMulai: date({ mode: "string" }).notNull(),
    periodeSelesai: date({ mode: "string" }).notNull(),
    gajiKotor: rupiah().notNull(),
    potonganTekor: rupiah().notNull(),
    /** Uang yang dibayarkan. */
    gajiBersih: rupiah().notNull().generatedAlwaysAs(sql`gaji_kotor - potongan_tekor`),
    dariAkun: akunKasEnum().notNull(),
    tanggalBayar: date({ mode: "string" }).notNull(),
    keterangan: varchar({ length: 200 }),
    dibuatOleh: uuid().notNull(),
    dibuatAt: waktu().notNull().defaultNow(),
    dibatalkanAt: waktu(),
    dibatalkanOleh: uuid(),
    alasanBatal: varchar({ length: 100 }),
  },
  (t) => [
    foreignKey({
      name: "pembayaran_gaji_kolektor_fk",
      columns: [t.kolektorId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kolektorKantorId],
    }),
    foreignKey({
      name: "pembayaran_gaji_kantor_fk",
      columns: [t.kantorId],
      foreignColumns: [bukuKas.kantorId],
    }),
    foreignKey({
      name: "pembayaran_gaji_dibuat_oleh_fk",
      columns: [t.dibuatOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "pembayaran_gaji_dibatalkan_oleh_fk",
      columns: [t.dibatalkanOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    index("idx_pembayaran_gaji_kolektor").on(t.kolektorId, t.periodeMulai),
    index("idx_pembayaran_gaji_kantor_tanggal").on(t.kantorId, t.tanggalBayar),
    check(
      "pembayaran_gaji_periode_check",
      sql`${t.periodeMulai} <= ${t.periodeSelesai} AND ${t.periodeSelesai} < ${t.tanggalBayar}`,
    ),
    check(
      "pembayaran_gaji_nominal_check",
      sql`${t.gajiKotor} >= 0 AND ${t.potonganTekor} >= 0 AND ${t.potonganTekor} <= ${t.gajiKotor}`,
    ),
    check(
      "pembayaran_gaji_batal_check",
      sql`(${t.dibatalkanAt} IS NULL AND ${t.dibatalkanOleh} IS NULL AND ${t.alasanBatal} IS NULL)
        OR (${t.dibatalkanAt} IS NOT NULL AND ${t.dibatalkanOleh} IS NOT NULL AND ${t.alasanBatal} IS NOT NULL)`,
    ),
  ],
);
