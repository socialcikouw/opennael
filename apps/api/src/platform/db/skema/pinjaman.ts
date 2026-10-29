import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { foto } from "./foto";
import { kantor } from "./kantor";
import { jejakWaktu, rupiah, waktu } from "./kolom";
import { nasabah } from "./nasabah";
import { pengguna } from "./pengguna";

export const jenisPinjamanEnum = pgEnum("jenis_pinjaman", ["harian", "mingguan", "tempoan"]);
export const asalPinjamanEnum = pgEnum("asal_pinjaman", ["baru", "gulung", "migrasi"]);
export const jenisGulungEnum = pgEnum("jenis_gulung", ["tetap", "naik", "turun"]);
export const statusPinjamanEnum = pgEnum("status_pinjaman", [
  "berjalan",
  "macet",
  "lunas",
  "digulung",
  "batal",
  "diputihkan",
]);
export const alasanPemutihanEnum = pgEnum("alasan_pemutihan", [
  "macet_lama",
  "meninggal",
  "lainnya",
]);

/**
 * PINJAMAN — satu akad. Syarat akad (pokok, potongan, pencairan, total,
 * angsuran) DIBEKUKAN di sini pada hari akad; yang berubah sesudahnya hanya
 * keadaan berjalan: `saldo`, `status`, dan penanda selesai/macet/pemutihan/
 * batal. `saldo` adalah cache yang disengaja — berubah hanya bersama baris
 * `transaksi` penyebabnya. Lihat docs/skema/schema-pinjaman.md dan
 * docs/aturan-usaha.md (A, E).
 */
export const pinjaman = pgTable(
  "pinjaman",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    /** Kolektor yang MENCAIRKAN — fakta sejarah, tak ikut pindah. */
    pencairId: uuid().notNull(),
    nasabahId: uuid().notNull(),
    pinjamanKe: integer().notNull(),
    jenis: jenisPinjamanEnum().notNull(),
    tenor: integer().notNull(),
    asal: asalPinjamanEnum().notNull(),
    pinjamanAsalId: uuid(),
    jenisGulung: jenisGulungEnum(),
    dibuatOleh: uuid().notNull(),
    /** Wajib untuk akad yang mengeluarkan uang; salinan migrasi bebas. */
    fotoSerahTerimaId: uuid(),

    tanggalAkad: date({ mode: "string" }).notNull(),
    /** Hanya migrasi: hari disalin; sejak hari itu ia ditagih. */
    tanggalDisalin: date({ mode: "string" }),
    jatuhTempo: date({ mode: "string" }).generatedAlwaysAs(
      sql`CASE WHEN jenis = 'tempoan' THEN tanggal_akad + tenor END`,
    ),
    tanggalMacet: date({ mode: "string" }),
    tanggalSelesai: date({ mode: "string" }),

    pokok: rupiah().notNull(),
    potonganAdmin: rupiah().notNull(),
    tabunganMasuk: rupiah().notNull(),
    saldoLama: rupiah().notNull().default(0),
    pencairan: rupiah().notNull(),
    totalKembali: rupiah().notNull(),
    angsuran: rupiah().notNull(),
    saldoAwal: rupiah().notNull(),

    dropBaru: rupiah().notNull(),
    dropGulung: rupiah().notNull().default(0),
    droping: rupiah().notNull().generatedAlwaysAs(sql`drop_baru + drop_gulung`),
    pokokBerkurang: rupiah().notNull().default(0),

    status: statusPinjamanEnum().notNull().default("berjalan"),
    saldo: rupiah().notNull(),
    angsuranKe: integer()
      .notNull()
      .generatedAlwaysAs(sql`((total_kembali - saldo) / angsuran)::integer`),

    diputihkanAt: waktu(),
    diputihkanOleh: uuid(),
    alasanPemutihan: alasanPemutihanEnum(),
    keteranganPemutihan: varchar({ length: 200 }),

    dibatalkanAt: waktu(),
    dibatalkanOleh: uuid(),
    alasanBatal: varchar({ length: 100 }),
    ...jejakWaktu(),
  },
  (t) => [
    foreignKey({ name: "pinjaman_kantor_fk", columns: [t.kantorId], foreignColumns: [kantor.id] }),
    foreignKey({
      name: "pinjaman_pencair_fk",
      columns: [t.pencairId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kolektorKantorId],
    }),
    foreignKey({
      name: "pinjaman_nasabah_fk",
      columns: [t.nasabahId, t.kantorId],
      foreignColumns: [nasabah.id, nasabah.kantorId],
    }),
    // Gulung hanya dari pinjaman nasabah yang sama (otomatis kantor yang sama).
    foreignKey({
      name: "pinjaman_asal_fk",
      columns: [t.pinjamanAsalId, t.nasabahId],
      foreignColumns: [t.id, t.nasabahId],
    }),
    foreignKey({
      name: "pinjaman_dibuat_oleh_fk",
      columns: [t.dibuatOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "pinjaman_diputihkan_oleh_fk",
      columns: [t.diputihkanOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "pinjaman_dibatalkan_oleh_fk",
      columns: [t.dibatalkanOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "pinjaman_foto_fk",
      columns: [t.fotoSerahTerimaId, t.kantorId],
      foreignColumns: [foto.id, foto.kantorId],
    }),

    unique("uniq_pinjaman_id_kantor").on(t.id, t.kantorId),
    unique("uniq_pinjaman_id_nasabah").on(t.id, t.nasabahId),
    uniqueIndex("uniq_pinjaman_aktif_nasabah")
      .on(t.nasabahId)
      .where(sql`${t.status} IN ('berjalan', 'macet')`),
    uniqueIndex("uniq_pinjaman_nasabah_ke")
      .on(t.nasabahId, t.pinjamanKe)
      .where(sql`${t.status} <> 'batal'`),
    uniqueIndex("uniq_pinjaman_asal")
      .on(t.pinjamanAsalId)
      .where(sql`${t.pinjamanAsalId} IS NOT NULL AND ${t.status} <> 'batal'`),
    uniqueIndex("uniq_pinjaman_foto")
      .on(t.fotoSerahTerimaId)
      .where(sql`${t.fotoSerahTerimaId} IS NOT NULL`),
    index("idx_pinjaman_kantor_status").on(t.kantorId, t.status),
    index("idx_pinjaman_pencair_akad").on(t.pencairId, t.tanggalAkad),
    index("idx_pinjaman_kantor_akad").on(t.kantorId, t.tanggalAkad),
    index("idx_pinjaman_kantor_selesai")
      .on(t.kantorId, t.tanggalSelesai)
      .where(sql`${t.tanggalSelesai} IS NOT NULL`),

    check("pinjaman_ke_check", sql`${t.pinjamanKe} >= 1`),
    check("pinjaman_pokok_check", sql`${t.pokok} > 0 AND ${t.pokok} % 100000 = 0`),
    check(
      "pinjaman_tenor_check",
      sql`(${t.jenis} = 'harian' AND ${t.tenor} = 24)
        OR (${t.jenis} = 'mingguan' AND ${t.tenor} IN (6, 8, 10))
        OR (${t.jenis} = 'tempoan' AND ${t.tenor} IN (7, 10, 14))`,
    ),
    check(
      "pinjaman_nominal_check",
      sql`${t.potonganAdmin} >= 0 AND ${t.tabunganMasuk} >= 0 AND ${t.saldoLama} >= 0
        AND ${t.pencairan} >= 0 AND ${t.dropBaru} >= 0 AND ${t.dropGulung} >= 0
        AND ${t.pokokBerkurang} >= 0 AND ${t.totalKembali} >= ${t.pokok}`,
    ),
    check(
      "pinjaman_angsuran_check",
      sql`${t.angsuran} > 0 AND (
        (${t.jenis} = 'tempoan' AND ${t.angsuran} = ${t.totalKembali})
        OR (${t.jenis} <> 'tempoan' AND ${t.angsuran} * ${t.tenor} = ${t.totalKembali}))`,
    ),
    check(
      "pinjaman_saldo_check",
      sql`0 <= ${t.saldo} AND ${t.saldo} <= ${t.saldoAwal} AND ${t.saldoAwal} <= ${t.totalKembali}`,
    ),
    check(
      "pinjaman_pencairan_check",
      sql`(${t.asal} = 'migrasi' AND ${t.pencairan} = 0 AND ${t.potonganAdmin} = 0
          AND ${t.dropBaru} = 0 AND ${t.dropGulung} = 0)
        OR (${t.asal} <> 'migrasi' AND ${t.saldoAwal} = ${t.totalKembali} AND ${t.pencairan} > 0
          AND ${t.pencairan} = ${t.pokok} - ${t.potonganAdmin} - ${t.tabunganMasuk} - ${t.saldoLama}
          AND ${t.dropBaru} + ${t.dropGulung} = ${t.pokok})`,
    ),
    check(
      "pinjaman_disalin_check",
      sql`(${t.asal} = 'migrasi' AND ${t.tanggalDisalin} IS NOT NULL AND ${t.tanggalDisalin} >= ${t.tanggalAkad})
        OR (${t.asal} <> 'migrasi' AND ${t.tanggalDisalin} IS NULL)`,
    ),
    check(
      "pinjaman_gulung_check",
      sql`(${t.asal} = 'gulung' AND ${t.pinjamanAsalId} IS NOT NULL AND ${t.jenisGulung} IS NOT NULL)
        OR (${t.asal} <> 'gulung' AND ${t.pinjamanAsalId} IS NULL AND ${t.jenisGulung} IS NULL
          AND ${t.saldoLama} = 0 AND ${t.dropGulung} = 0 AND ${t.pokokBerkurang} = 0)`,
    ),
    check(
      "pinjaman_status_check",
      sql`(${t.status} IN ('berjalan', 'macet') AND ${t.saldo} > 0 AND ${t.tanggalSelesai} IS NULL)
        OR (${t.status} IN ('lunas', 'digulung') AND ${t.saldo} = 0 AND ${t.tanggalSelesai} IS NOT NULL)
        OR (${t.status} = 'batal' AND ${t.tanggalSelesai} IS NOT NULL)
        OR (${t.status} = 'diputihkan' AND ${t.saldo} > 0 AND ${t.tanggalSelesai} IS NOT NULL)`,
    ),
    // Diputihkan boleh menyimpan tanggal macet: batal pemutihan mengembalikan status persis.
    check(
      "pinjaman_macet_check",
      sql`(${t.status} = 'macet' AND ${t.tanggalMacet} IS NOT NULL)
        OR (${t.status} <> 'macet' AND (${t.tanggalMacet} IS NULL OR ${t.status} = 'diputihkan'))`,
    ),
    check(
      "pinjaman_pemutihan_check",
      sql`(${t.status} = 'diputihkan' AND ${t.diputihkanAt} IS NOT NULL AND ${t.diputihkanOleh} IS NOT NULL
          AND ${t.alasanPemutihan} IS NOT NULL AND ${t.keteranganPemutihan} IS NOT NULL)
        OR (${t.status} <> 'diputihkan' AND ${t.diputihkanAt} IS NULL AND ${t.diputihkanOleh} IS NULL
          AND ${t.alasanPemutihan} IS NULL AND ${t.keteranganPemutihan} IS NULL)`,
    ),
    check(
      "pinjaman_batal_check",
      sql`(${t.status} = 'batal' AND ${t.dibatalkanAt} IS NOT NULL AND ${t.dibatalkanOleh} IS NOT NULL
          AND ${t.alasanBatal} IS NOT NULL)
        OR (${t.status} <> 'batal' AND ${t.dibatalkanAt} IS NULL AND ${t.dibatalkanOleh} IS NULL
          AND ${t.alasanBatal} IS NULL)`,
    ),
    // Akad tanpa foto ditolak. Impor data dari sistem lama memasang ulang
    // constraint ini sebagai NOT VALID (pinjaman lama memang tak berfoto).
    check("pinjaman_foto_check", sql`${t.asal} = 'migrasi' OR ${t.fotoSerahTerimaId} IS NOT NULL`),
  ],
);
