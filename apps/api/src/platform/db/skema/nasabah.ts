import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  pgTable,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { foto } from "./foto";
import { kantor } from "./kantor";
import { cekLokasi, jejakWaktu, lokasi, waktu } from "./kolom";
import { pengguna } from "./pengguna";
import { wilayah } from "./wilayah";

/**
 * NASABAH — satu orang peminjam di satu kantor, terpisah dari pinjamannya.
 * NIK (opsional) satu-satunya penunjuk pasti satu orang; nama boleh kembar.
 * Pemegangnya saat ini satu kolektor (`kolektor_id`) — pencair akad &
 * pencatat setoran adalah fakta sejarah di tabelnya sendiri.
 *
 * `saldo_tabungan` adalah cache yang disengaja: hanya bergeser di transaksi
 * database yang sama dengan baris penyebabnya (akad, pelunasan, penarikan,
 * koreksi). Lihat docs/skema/schema-nasabah.md.
 */
export const nasabah = pgTable(
  "nasabah",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    /** Kolektor PEMEGANG saat ini. */
    kolektorId: uuid().notNull(),
    nama: varchar({ length: 50 }).notNull(),
    wilayahId: uuid().notNull(),
    /** E.164 (`+628…`). */
    nomorHp: varchar({ length: 16 }),
    /** 16 digit; unik per kantor bila diisi. Selain bos melihatnya tersamar. */
    nik: varchar({ length: 16 }),
    /** Titik rumah, direkam HP kolektor di depan rumah. */
    ...lokasi(),
    saldoTabungan: bigint({ mode: "number" }).notNull().default(0),
    /** Foto KTP terakhir (opsional). */
    fotoKtpId: uuid(),
    /** Terisi = tak bisa akad baru (otomatis saat pinjamannya diputihkan). */
    diblokirAt: waktu(),
    diblokirOleh: uuid(),
    alasanBlokir: varchar({ length: 200 }),
    ...jejakWaktu(),
  },
  (t) => [
    foreignKey({ name: "nasabah_kantor_fk", columns: [t.kantorId], foreignColumns: [kantor.id] }),
    foreignKey({
      name: "nasabah_kolektor_fk",
      columns: [t.kolektorId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kolektorKantorId],
    }),
    foreignKey({
      name: "nasabah_wilayah_fk",
      columns: [t.wilayahId, t.kantorId],
      foreignColumns: [wilayah.id, wilayah.kantorId],
    }),
    foreignKey({
      name: "nasabah_diblokir_oleh_fk",
      columns: [t.diblokirOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "nasabah_foto_ktp_fk",
      columns: [t.fotoKtpId, t.kantorId],
      foreignColumns: [foto.id, foto.kantorId],
    }),
    unique("uniq_nasabah_id_kantor").on(t.id, t.kantorId),
    uniqueIndex("uniq_nasabah_kantor_nik").on(t.kantorId, t.nik).where(sql`${t.nik} IS NOT NULL`),
    index("idx_nasabah_kolektor_nama").on(t.kolektorId, t.nama),
    index("idx_nasabah_kantor_nama").on(t.kantorId, t.nama),
    index("idx_nasabah_wilayah").on(t.wilayahId),
    // "Mungkin nasabah lama?" saat kolektor mengetik formulir orang baru.
    index("idx_nasabah_kunci_nama").on(
      t.kantorId,
      t.wilayahId,
      sql`lower(btrim(regexp_replace(${t.nama}, '\\s+', ' ', 'g')))`,
    ),
    check("nasabah_saldo_tabungan_check", sql`${t.saldoTabungan} >= 0`),
    check("nasabah_nik_check", sql`${t.nik} IS NULL OR ${t.nik} ~ '^[0-9]{16}$'`),
    check("nasabah_nomor_hp_check", sql`${t.nomorHp} IS NULL OR ${t.nomorHp} ~ '^\\+[0-9]{8,15}$'`),
    check("nasabah_lokasi_check", cekLokasi(t)),
    check(
      "nasabah_blokir_check",
      sql`(${t.diblokirAt} IS NULL AND ${t.diblokirOleh} IS NULL AND ${t.alasanBlokir} IS NULL)
        OR (${t.diblokirAt} IS NOT NULL AND ${t.diblokirOleh} IS NOT NULL AND ${t.alasanBlokir} IS NOT NULL)`,
    ),
  ],
);
