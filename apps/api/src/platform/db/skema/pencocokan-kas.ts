import { sql } from "drizzle-orm";
import { check, date, foreignKey, index, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { bukuKas } from "./buku-kas";
import { cekBatal, rupiah, waktu } from "./kolom";
import { akunKasEnum } from "./mutasi-kas-kantor";
import { pengguna } from "./pengguna";

/**
 * PENCOCOKAN KAS — bos atau pengawas menghitung uang nyata di satu akun
 * (isi brankas / saldo rekening) dan dibandingkan dengan buku kas yang
 * dibekukan saat itu (hitung buta). Hanya mencatat, tidak membetulkan buku.
 * HANYA BERTAMBAH. Lihat docs/skema/schema-pencocokan-kas.md.
 */
export const pencocokanKas = pgTable(
  "pencocokan_kas",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    tanggal: date({ mode: "string" }).notNull(),
    akun: akunKasEnum().notNull(),
    /** Tunai: brankas seharusnya; bank: saldo bank — dibekukan saat dicocokkan. */
    saldoBuku: rupiah().notNull(),
    saldoNyata: rupiah().notNull(),
    /** Minus = kurang; plus = lebih. */
    selisih: rupiah().notNull().generatedAlwaysAs(sql`saldo_nyata - saldo_buku`),
    keterangan: varchar({ length: 200 }),
    dicocokkanOleh: uuid().notNull(),
    dibuatAt: waktu().notNull().defaultNow(),
    dibatalkanAt: waktu(),
    dibatalkanOleh: uuid(),
    alasanBatal: varchar({ length: 100 }),
  },
  (t) => [
    foreignKey({
      name: "pencocokan_kas_kantor_fk",
      columns: [t.kantorId],
      foreignColumns: [bukuKas.kantorId],
    }),
    foreignKey({
      name: "pencocokan_kas_dicocokkan_oleh_fk",
      columns: [t.dicocokkanOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "pencocokan_kas_dibatalkan_oleh_fk",
      columns: [t.dibatalkanOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    index("idx_pencocokan_kas_kantor_tanggal").on(t.kantorId, t.tanggal),
    check("pencocokan_kas_nominal_check", sql`${t.saldoNyata} >= 0`),
    check(
      "pencocokan_kas_keterangan_check",
      sql`${t.saldoNyata} = ${t.saldoBuku}
        OR (${t.keterangan} IS NOT NULL AND length(btrim(${t.keterangan})) > 0)`,
    ),
    check("pencocokan_kas_batal_check", cekBatal(t)),
  ],
);
