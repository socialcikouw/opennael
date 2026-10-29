import { date, foreignKey, index, pgTable, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { waktu } from "./kolom";
import { pengguna } from "./pengguna";
import { pinjaman } from "./pinjaman";

/**
 * LIBUR NASABAH — kolektor menandai satu pinjaman tidak ditagih pada satu
 * hari. Tanda bukan uang: salah tandai dihapus bos (hari yang sama) dengan
 * jejak di riwayat. Libur & transaksi pada pinjaman + hari yang sama saling
 * menolak — trigger dua arah. Lihat docs/skema/schema-libur-nasabah.md.
 */
export const liburNasabah = pgTable(
  "libur_nasabah",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    /** Kolektor yang MENANDAI — fakta sejarah. */
    pencatatId: uuid().notNull(),
    pinjamanId: uuid().notNull(),
    tanggal: date({ mode: "string" }).notNull(),
    alasanLibur: varchar({ length: 100 }),
    dibuatAt: waktu().notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "libur_nasabah_kantor_fk",
      columns: [t.kantorId],
      foreignColumns: [kantor.id],
    }),
    foreignKey({
      name: "libur_nasabah_pencatat_fk",
      columns: [t.pencatatId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kolektorKantorId],
    }),
    foreignKey({
      name: "libur_nasabah_pinjaman_fk",
      columns: [t.pinjamanId, t.kantorId],
      foreignColumns: [pinjaman.id, pinjaman.kantorId],
    }),
    unique("uniq_libur_nasabah_pinjaman_tanggal").on(t.pinjamanId, t.tanggal),
    index("idx_libur_nasabah_pencatat_tanggal").on(t.pencatatId, t.tanggal),
    index("idx_libur_nasabah_kantor_tanggal").on(t.kantorId, t.tanggal),
  ],
);
