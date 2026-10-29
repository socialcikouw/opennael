import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  pgEnum,
  pgTable,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { rupiah, waktu } from "./kolom";
import { pengguna } from "./pengguna";
import { pinjaman } from "./pinjaman";

export const jenisTransaksiEnum = pgEnum("jenis_transaksi", ["angsuran", "pelunasan", "gulung"]);

/**
 * TRANSAKSI — satu peristiwa uang atas satu pinjaman pada satu hari. HANYA
 * BERTAMBAH: salah input dibatalkan bos (hari yang sama), tidak disunting
 * atau dihapus — trigger `transaksi_append_only`. Isi per jenis:
 *
 *   angsuran  : murni = angsuran dibayar, pelunasan = uang lebih, tab keluar 0, saldo sesudah > 0
 *   pelunasan : murni = dibayar nasabah, pelunasan = ditutup tabungan, tab keluar = seluruh tabungan, saldo 0
 *   gulung    : murni 0, pelunasan = sisa saldo ditutup penerus, tab keluar 0, saldo 0
 *
 * Lihat docs/skema/schema-transaksi.md dan docs/aturan-usaha.md (C, D, E).
 */
export const transaksi = pgTable(
  "transaksi",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    /** Kolektor yang MENCATAT — fakta sejarah, dasar gaji. */
    pencatatId: uuid().notNull(),
    pinjamanId: uuid().notNull(),
    /** Hari pembukuan (kalender kantor) — satu-satunya sumbu waktu laporan. */
    tanggal: date({ mode: "string" }).notNull(),
    jenis: jenisTransaksiEnum().notNull(),
    setoranMurni: rupiah().notNull().default(0),
    setoranPelunasan: rupiah().notNull().default(0),
    tabunganKeluar: rupiah().notNull().default(0),
    /** Uang setoran yang masuk; bisa negatif (pelunasan bertabungan lebih). */
    storting: rupiah()
      .notNull()
      .generatedAlwaysAs(sql`setoran_murni + setoran_pelunasan - tabungan_keluar`),
    /** Saldo pinjaman sesudah baris ini — posisi piutang pada tanggal lampau. */
    saldoSesudah: rupiah().notNull(),
    dibatalkanAt: waktu(),
    dibatalkanOleh: uuid(),
    alasanBatal: varchar({ length: 100 }),
    dibuatAt: waktu().notNull().defaultNow(),
  },
  (t) => [
    foreignKey({ name: "transaksi_kantor_fk", columns: [t.kantorId], foreignColumns: [kantor.id] }),
    foreignKey({
      name: "transaksi_pencatat_fk",
      columns: [t.pencatatId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kolektorKantorId],
    }),
    foreignKey({
      name: "transaksi_pinjaman_fk",
      columns: [t.pinjamanId, t.kantorId],
      foreignColumns: [pinjaman.id, pinjaman.kantorId],
    }),
    foreignKey({
      name: "transaksi_dibatalkan_oleh_fk",
      columns: [t.dibatalkanOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    unique("uniq_transaksi_id_kantor").on(t.id, t.kantorId),
    // Satu transaksi berlaku per pinjaman per hari — penahan kirim ganda.
    uniqueIndex("uniq_transaksi_pinjaman_tanggal")
      .on(t.pinjamanId, t.tanggal)
      .where(sql`${t.dibatalkanAt} IS NULL`),
    check(
      "transaksi_nominal_check",
      sql`${t.setoranMurni} >= 0 AND ${t.setoranPelunasan} >= 0 AND ${t.tabunganKeluar} >= 0
        AND ${t.saldoSesudah} >= 0 AND ${t.setoranMurni} + ${t.setoranPelunasan} > 0`,
    ),
    check(
      "transaksi_jenis_check",
      sql`(${t.jenis} = 'angsuran' AND ${t.tabunganKeluar} = 0 AND ${t.saldoSesudah} > 0)
        OR (${t.jenis} = 'pelunasan' AND ${t.saldoSesudah} = 0 AND ${t.setoranPelunasan} <= ${t.tabunganKeluar})
        OR (${t.jenis} = 'gulung' AND ${t.setoranMurni} = 0 AND ${t.tabunganKeluar} = 0 AND ${t.saldoSesudah} = 0)`,
    ),
    check(
      "transaksi_batal_check",
      sql`(${t.dibatalkanAt} IS NULL AND ${t.dibatalkanOleh} IS NULL AND ${t.alasanBatal} IS NULL)
        OR (${t.dibatalkanAt} IS NOT NULL AND ${t.dibatalkanOleh} IS NOT NULL AND ${t.alasanBatal} IS NOT NULL)`,
    ),
  ],
);
