import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { waktu } from "./kolom";
import { pengguna } from "./pengguna";
import { transaksi } from "./transaksi";

/**
 * TRANSFER SETORAN — satu setoran nasabah (transaksi) yang dibayar sebagian
 * atau seluruhnya lewat transfer ke rekening kantor; dicatat kasir sore hari.
 * Kolektor & tanggal dibaca dari transaksinya (tidak disalin). Batas nominal
 * per jenis transaksi dijaga trigger `transfer_setoran_batas`; terkunci
 * sesudah kas diterima (`transfer_setoran_terkunci`). HANYA BERTAMBAH.
 * Lihat docs/skema/schema-transfer-setoran.md dan docs/aturan-usaha.md I3.
 */
export const transferSetoran = pgTable(
  "transfer_setoran",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    transaksiId: uuid().notNull(),
    nominal: bigint({ mode: "number" }).notNull(),
    dibuatOleh: uuid().notNull(),
    dibuatAt: waktu().notNull().defaultNow(),
    dibatalkanAt: waktu(),
    dibatalkanOleh: uuid(),
    alasanBatal: varchar({ length: 100 }),
  },
  (t) => [
    foreignKey({
      name: "transfer_setoran_transaksi_fk",
      columns: [t.transaksiId, t.kantorId],
      foreignColumns: [transaksi.id, transaksi.kantorId],
    }),
    foreignKey({
      name: "transfer_setoran_dibuat_oleh_fk",
      columns: [t.dibuatOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "transfer_setoran_dibatalkan_oleh_fk",
      columns: [t.dibatalkanOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    // Satu catatan transfer berlaku per setoran; sekaligus jalur join dari transaksi.
    uniqueIndex("uniq_transfer_setoran_transaksi")
      .on(t.transaksiId)
      .where(sql`${t.dibatalkanAt} IS NULL`),
    check("transfer_setoran_nominal_check", sql`${t.nominal} > 0`),
    check(
      "transfer_setoran_batal_check",
      sql`(${t.dibatalkanAt} IS NULL AND ${t.dibatalkanOleh} IS NULL AND ${t.alasanBatal} IS NULL)
        OR (${t.dibatalkanAt} IS NOT NULL AND ${t.dibatalkanOleh} IS NOT NULL AND ${t.alasanBatal} IS NOT NULL)`,
    ),
  ],
);
