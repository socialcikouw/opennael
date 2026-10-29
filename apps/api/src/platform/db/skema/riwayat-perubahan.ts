import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { waktu } from "./kolom";
import { pengguna } from "./pengguna";

/**
 * Tabel yang barisnya bisa ditimpa/dihapus. Tabel uang yang hanya bertambah
 * TIDAK masuk — barisnya sudah jejaknya sendiri. Lima nilai terakhir adalah
 * ARSIP untuk jejak sistem lama (tidak ditulis lagi).
 */
export const tabelBerjejakEnum = pgEnum("tabel_berjejak", [
  "kantor",
  "pekan_kerja",
  "buku_kas",
  "kebijakan",
  "pengguna",
  "wilayah",
  "nasabah",
  "pinjaman",
  "hari_kolektor",
  "libur_nasabah",
  "libur_kantor",
  "tarif_gaji",
  "rute_kolektor",
  "transaksi",
  "biaya_tak_terduga",
  "kebijakan_kantor",
  "kebijakan_kolektor",
  "perangkat",
]);

/**
 * RIWAYAT PERUBAHAN — jejak perbuatan tangan yang MENIMPA atau MENGHAPUS data
 * tersimpan; `sebelum`/`sesudah` hanya kolom yang berubah. Hanya bertambah —
 * trigger `riwayat_perubahan_append_only`. Lihat
 * docs/skema/schema-riwayat-perubahan.md.
 */
export const riwayatPerubahan = pgTable(
  "riwayat_perubahan",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    tabel: tabelBerjejakEnum().notNull(),
    /** Tanpa FK: satu tabel jejak melayani semua tabel, dan bertahan walau barisnya dihapus. */
    barisId: uuid().notNull(),
    aksi: varchar({ length: 40 }).notNull(),
    sebelum: jsonb(),
    sesudah: jsonb(),
    alasanPerubahan: varchar({ length: 200 }),
    pelakuId: uuid().notNull(),
    dibuatAt: waktu().notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "riwayat_perubahan_kantor_fk",
      columns: [t.kantorId],
      foreignColumns: [kantor.id],
    }),
    foreignKey({
      name: "riwayat_perubahan_pelaku_fk",
      columns: [t.pelakuId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    index("idx_riwayat_perubahan_baris").on(t.tabel, t.barisId, t.dibuatAt),
    index("idx_riwayat_perubahan_kantor").on(t.kantorId, t.dibuatAt),
    index("idx_riwayat_perubahan_pelaku").on(t.pelakuId, t.dibuatAt),
    check("riwayat_perubahan_aksi_check", sql`${t.aksi} ~ '^[a-z_]+$'`),
    check("riwayat_perubahan_isi_check", sql`${t.sebelum} IS NOT NULL OR ${t.sesudah} IS NOT NULL`),
  ],
);
