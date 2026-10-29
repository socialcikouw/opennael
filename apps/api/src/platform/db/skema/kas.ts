import { type AnyColumn, sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { waktu } from "./kolom";
import { pengguna } from "./pengguna";

/** Akun kas kantor — satu brankas, satu rekening (docs/skema/schema-buku-kas.md). */
export const akunKasEnum = pgEnum("akun_kas", ["tunai", "bank"]);

export const jenisMutasiKasEnum = pgEnum("jenis_mutasi_kas", [
  "setor_modal",
  "tarik_modal",
  "biaya_kantor",
  "pindah_akun",
  "lain_masuk",
  "lain_keluar",
]);

const rupiah = () => bigint({ mode: "number" });

/** Kolom batal terisi bersamaan atau kosong bersamaan. */
const cekBatal = (t: {
  dibatalkanAt: AnyColumn;
  dibatalkanOleh: AnyColumn;
  alasanBatal: AnyColumn;
}) =>
  sql`(${t.dibatalkanAt} IS NULL AND ${t.dibatalkanOleh} IS NULL AND ${t.alasanBatal} IS NULL)
    OR (${t.dibatalkanAt} IS NOT NULL AND ${t.dibatalkanOleh} IS NOT NULL AND ${t.alasanBatal} IS NOT NULL)`;

/**
 * BUKU KAS — satu kantor membuka buku kasnya: tanggal mulai & isi kas saat
 * itu. Titik nol laporan kas; tanpa baris ini mutasi, penarikan tabungan,
 * gaji, dan pencocokan ditolak (FK ke tabel ini). Kas awal hanya boleh
 * dibetulkan di hari pembukaan (dicatat di riwayat).
 * Lihat docs/skema/schema-buku-kas.md.
 */
export const bukuKas = pgTable(
  "buku_kas",
  {
    kantorId: uuid().primaryKey(),
    tanggalBuka: date({ mode: "string" }).notNull(),
    kasAwalTunai: rupiah().notNull().default(0),
    kasAwalBank: rupiah().notNull().default(0),
    dibukaOleh: uuid().notNull(),
    dibukaAt: waktu().notNull().defaultNow(),
    diubahAt: waktu().notNull().defaultNow(),
  },
  (t) => [
    foreignKey({ name: "buku_kas_kantor_fk", columns: [t.kantorId], foreignColumns: [kantor.id] }),
    foreignKey({
      name: "buku_kas_dibuka_oleh_fk",
      columns: [t.dibukaOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    check("buku_kas_nominal_check", sql`${t.kasAwalTunai} >= 0 AND ${t.kasAwalBank} >= 0`),
  ],
);

/**
 * MUTASI KAS KANTOR — gerakan uang kantor yang dicatat tangan oleh bos dan
 * TIDAK punya tabel asal (modal, biaya kantor, pindah akun, lain-lain). Uang
 * kolektor, penarikan tabungan, dan gaji dibaca dari tabelnya sendiri. HANYA
 * BERTAMBAH. Lihat docs/skema/schema-mutasi-kas-kantor.md.
 */
export const mutasiKasKantor = pgTable(
  "mutasi_kas_kantor",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    tanggal: date({ mode: "string" }).notNull(),
    jenis: jenisMutasiKasEnum().notNull(),
    /** Akun yang berkurang; kosong untuk mutasi masuk. */
    dariAkun: akunKasEnum(),
    /** Akun yang bertambah; kosong untuk mutasi keluar. */
    keAkun: akunKasEnum(),
    nominal: rupiah().notNull(),
    keterangan: varchar({ length: 200 }).notNull(),
    dibuatOleh: uuid().notNull(),
    dibuatAt: waktu().notNull().defaultNow(),
    dibatalkanAt: waktu(),
    dibatalkanOleh: uuid(),
    alasanBatal: varchar({ length: 100 }),
  },
  (t) => [
    foreignKey({
      name: "mutasi_kas_kantor_kantor_fk",
      columns: [t.kantorId],
      foreignColumns: [bukuKas.kantorId],
    }),
    foreignKey({
      name: "mutasi_kas_kantor_dibuat_oleh_fk",
      columns: [t.dibuatOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "mutasi_kas_kantor_dibatalkan_oleh_fk",
      columns: [t.dibatalkanOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    index("idx_mutasi_kas_kantor_kantor_tanggal").on(t.kantorId, t.tanggal),
    check("mutasi_kas_kantor_nominal_check", sql`${t.nominal} > 0`),
    check("mutasi_kas_kantor_keterangan_check", sql`length(btrim(${t.keterangan})) > 0`),
    check(
      "mutasi_kas_kantor_akun_check",
      sql`(${t.jenis}::text IN ('setor_modal', 'lain_masuk')
          AND ${t.keAkun} IS NOT NULL AND ${t.dariAkun} IS NULL)
        OR (${t.jenis}::text IN ('tarik_modal', 'biaya_kantor', 'lain_keluar')
          AND ${t.dariAkun} IS NOT NULL AND ${t.keAkun} IS NULL)
        OR (${t.jenis}::text = 'pindah_akun'
          AND ${t.dariAkun} IS NOT NULL AND ${t.keAkun} IS NOT NULL AND ${t.dariAkun} <> ${t.keAkun})`,
    ),
    check("mutasi_kas_kantor_batal_check", cekBatal(t)),
  ],
);

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
