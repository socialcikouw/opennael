import { sql } from "drizzle-orm";
import { check, date, foreignKey, pgTable, primaryKey, smallint, uuid } from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { jejakWaktu } from "./kolom";
import { pengguna } from "./pengguna";

/**
 * PEKAN KERJA — hari kerja kantor dalam sepekan, BERTANGGAL: pola untuk satu
 * hari = baris terbaru yang `berlaku_mulai`-nya ≤ hari itu, sehingga mengubah
 * pekan kerja tidak menggeser jadwal & tunggakan hari lampau. Tidak boleh
 * mundur — dijaga trigger `pekan_kerja_tidak_mundur` (migrasi SQL).
 * Lihat docs/skema/schema-pekan-kerja.md.
 */
export const pekanKerja = pgTable(
  "pekan_kerja",
  {
    kantorId: uuid().notNull(),
    berlakuMulai: date({ mode: "string" }).notNull(),
    /** Bitmask: bit d = hari ke-d, 0 = Minggu … 6 = Sabtu. 126 = Senin–Sabtu. */
    hariKerja: smallint().notNull(),
    dibuatOleh: uuid().notNull(),
    ...jejakWaktu(),
  },
  (t) => [
    primaryKey({ name: "pekan_kerja_pkey", columns: [t.kantorId, t.berlakuMulai] }),
    foreignKey({
      name: "pekan_kerja_kantor_fk",
      columns: [t.kantorId],
      foreignColumns: [kantor.id],
    }),
    foreignKey({
      name: "pekan_kerja_dibuat_oleh_fk",
      columns: [t.dibuatOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    check("pekan_kerja_hari_check", sql`${t.hariKerja} BETWEEN 1 AND 127`),
  ],
);
