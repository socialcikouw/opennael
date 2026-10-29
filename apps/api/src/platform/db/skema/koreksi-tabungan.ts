import { sql } from "drizzle-orm";
import { check, date, foreignKey, index, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { rupiah, waktu } from "./kolom";
import { nasabah } from "./nasabah";
import { pengguna } from "./pengguna";

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
