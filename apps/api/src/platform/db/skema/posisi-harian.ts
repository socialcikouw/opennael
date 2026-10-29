import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";
import { waktu } from "./kolom";
import { pengguna } from "./pengguna";
import { jenisPinjamanEnum } from "./pinjaman";

const rupiah = () => bigint({ mode: "number" });

/**
 * POSISI HARIAN — potret portofolio satu kolektor (pemegang) untuk satu jenis
 * pinjaman pada penutupan satu hari. Ditulis sapuan tutup hari (hapus lalu
 * tulis, hanya untuk hari yang sedang ditutup); tak pernah di-UPDATE. Cache
 * yang disengaja: membekukan pemegang hari itu & mempercepat grafik harian.
 * Lihat docs/skema/schema-posisi-harian.md.
 */
export const posisiHarian = pgTable(
  "posisi_harian",
  {
    kantorId: uuid().notNull(),
    /** Pemegang (`nasabah.kolektor_id`) saat hari itu ditutup. */
    kolektorId: uuid().notNull(),
    tanggal: date({ mode: "string" }).notNull(),
    jenis: jenisPinjamanEnum().notNull(),
    jumlahBerjalan: integer().notNull().default(0),
    jumlahMacet: integer().notNull().default(0),
    saldoBerjalan: rupiah().notNull().default(0),
    saldoMacet: rupiah().notNull().default(0),
    /** Σ angsuran pinjaman berjalan — kewajiban tagih. */
    angsuranBerjalan: rupiah().notNull().default(0),
    angsuranMacet: rupiah().notNull().default(0),
    dibuatAt: waktu().notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: "posisi_harian_pkey", columns: [t.kolektorId, t.tanggal, t.jenis] }),
    foreignKey({
      name: "posisi_harian_kolektor_fk",
      columns: [t.kolektorId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kolektorKantorId],
    }),
    index("idx_posisi_harian_kantor_tanggal").on(t.kantorId, t.tanggal),
    check(
      "posisi_harian_nominal_check",
      sql`${t.jumlahBerjalan} >= 0 AND ${t.jumlahMacet} >= 0
        AND ${t.saldoBerjalan} >= 0 AND ${t.saldoMacet} >= 0
        AND ${t.angsuranBerjalan} >= 0 AND ${t.angsuranMacet} >= 0`,
    ),
  ],
);
