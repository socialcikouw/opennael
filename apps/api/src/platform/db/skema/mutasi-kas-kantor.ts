import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { bukuKas } from "./buku-kas";
import { cekBatal, rupiah, waktu } from "./kolom";
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
