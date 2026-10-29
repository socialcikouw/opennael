import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { akunKasEnum, bukuKas } from "./kas";
import { waktu } from "./kolom";
import { nasabah } from "./nasabah";
import { pengguna } from "./pengguna";

const rupiah = () => bigint({ mode: "number" });

/**
 * PENARIKAN TABUNGAN — bos menyerahkan uang tabungan ke nasabah di luar
 * pelunasan, dari kas kantor (brankas atau rekening). Uang sungguhan: ikut
 * menjadi kas keluar di buku kas. Mengurangi `nasabah.saldo_tabungan` di
 * transaksi yang sama; batal (hari yang sama) mengembalikannya. HANYA
 * BERTAMBAH. Lihat docs/skema/schema-penarikan-tabungan.md.
 */
export const penarikanTabungan = pgTable(
  "penarikan_tabungan",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    nasabahId: uuid().notNull(),
    tanggal: date({ mode: "string" }).notNull(),
    nominal: rupiah().notNull(),
    dariAkun: akunKasEnum().notNull(),
    /** Saldo tabungan tepat sebelum penarikan — potret & pembanding CHECK. */
    saldoSebelum: rupiah().notNull(),
    alasanPenarikan: varchar({ length: 200 }).notNull(),
    dibuatOleh: uuid().notNull(),
    dibuatAt: waktu().notNull().defaultNow(),
    dibatalkanAt: waktu(),
    dibatalkanOleh: uuid(),
    alasanBatal: varchar({ length: 100 }),
  },
  (t) => [
    foreignKey({
      name: "penarikan_tabungan_kantor_fk",
      columns: [t.kantorId],
      foreignColumns: [bukuKas.kantorId],
    }),
    foreignKey({
      name: "penarikan_tabungan_nasabah_fk",
      columns: [t.nasabahId, t.kantorId],
      foreignColumns: [nasabah.id, nasabah.kantorId],
    }),
    foreignKey({
      name: "penarikan_tabungan_dibuat_oleh_fk",
      columns: [t.dibuatOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "penarikan_tabungan_dibatalkan_oleh_fk",
      columns: [t.dibatalkanOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    index("idx_penarikan_tabungan_nasabah").on(t.nasabahId, t.dibuatAt),
    index("idx_penarikan_tabungan_kantor_tanggal").on(t.kantorId, t.tanggal),
    check(
      "penarikan_tabungan_nominal_check",
      sql`${t.nominal} > 0 AND ${t.nominal} <= ${t.saldoSebelum}`,
    ),
    check("penarikan_tabungan_alasan_check", sql`length(btrim(${t.alasanPenarikan})) > 0`),
    check(
      "penarikan_tabungan_batal_check",
      sql`(${t.dibatalkanAt} IS NULL AND ${t.dibatalkanOleh} IS NULL AND ${t.alasanBatal} IS NULL)
        OR (${t.dibatalkanAt} IS NOT NULL AND ${t.dibatalkanOleh} IS NOT NULL AND ${t.alasanBatal} IS NOT NULL)`,
    ),
  ],
);

/**
 * KOREKSI TABUNGAN — bos membetulkan angka saldo tabungan yang salah, TANPA
 * uang berpindah (tidak menyentuh buku kas). Menyimpan selisih; salah koreksi
 * dibetulkan dengan koreksi tandingan — tak ada kolom batal. Tak pernah
 * diubah atau dihapus (`hanya_bertambah()`). Lihat
 * docs/skema/schema-koreksi-tabungan.md.
 */
export const koreksiTabungan = pgTable(
  "koreksi_tabungan",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    nasabahId: uuid().notNull(),
    tanggal: date({ mode: "string" }).notNull(),
    saldoSebelum: rupiah().notNull(),
    /** Positif menambah, negatif mengurangi. */
    selisih: rupiah().notNull(),
    alasanKoreksi: varchar({ length: 200 }).notNull(),
    dibuatOleh: uuid().notNull(),
    dibuatAt: waktu().notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "koreksi_tabungan_nasabah_fk",
      columns: [t.nasabahId, t.kantorId],
      foreignColumns: [nasabah.id, nasabah.kantorId],
    }),
    foreignKey({
      name: "koreksi_tabungan_dibuat_oleh_fk",
      columns: [t.dibuatOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    index("idx_koreksi_tabungan_nasabah").on(t.nasabahId, t.dibuatAt),
    check(
      "koreksi_tabungan_nominal_check",
      sql`${t.selisih} <> 0 AND ${t.saldoSebelum} >= 0 AND ${t.saldoSebelum} + ${t.selisih} >= 0`,
    ),
    check("koreksi_tabungan_alasan_check", sql`length(btrim(${t.alasanKoreksi})) > 0`),
  ],
);
