import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { hariKolektor } from "./hari-kolektor";
import { waktu } from "./kolom";
import { pengguna } from "./pengguna";

const rupiah = () => bigint({ mode: "number" });

/**
 * SERAH TERIMA KAS — kantor menerima uang tunai seorang kolektor untuk satu
 * hari. Kasir (atau bos) mengisi uang yang diterima tanpa melihat angka
 * seharusnya (hitung buta); server membekukan tunai seharusnya, tekor/lebih
 * setor = `selisih_setor` (turunan). HANYA BERTAMBAH: dibatalkan bos, tidak
 * disunting — trigger `serah_terima_kas_append_only`. Selama berlaku, hari
 * kolektor itu terkunci (`*_terkunci`). Lihat docs/skema/schema-serah-terima-kas.md.
 */
export const serahTerimaKas = pgTable(
  "serah_terima_kas",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    hariKolektorId: uuid().notNull(),
    /** Rumus aturan-usaha I1, dibekukan saat diterima. Boleh negatif. */
    tunaiSeharusnya: rupiah().notNull(),
    tunaiDiterima: rupiah().notNull(),
    /** Minus = tekor; plus = lebih setor. */
    selisihSetor: rupiah().notNull().generatedAlwaysAs(sql`tunai_diterima - tunai_seharusnya`),
    diterimaOleh: uuid().notNull(),
    dibuatAt: waktu().notNull().defaultNow(),
    dibatalkanAt: waktu(),
    dibatalkanOleh: uuid(),
    alasanBatal: varchar({ length: 100 }),
  },
  (t) => [
    foreignKey({
      name: "serah_terima_kas_hari_fk",
      columns: [t.hariKolektorId, t.kantorId],
      foreignColumns: [hariKolektor.id, hariKolektor.kantorId],
    }),
    foreignKey({
      name: "serah_terima_kas_diterima_oleh_fk",
      columns: [t.diterimaOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "serah_terima_kas_dibatalkan_oleh_fk",
      columns: [t.dibatalkanOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    // Satu serah terima berlaku per kolektor per hari.
    uniqueIndex("uniq_serah_terima_kas_hari")
      .on(t.hariKolektorId)
      .where(sql`${t.dibatalkanAt} IS NULL`),
    check("serah_terima_kas_nominal_check", sql`${t.tunaiDiterima} >= 0`),
    check(
      "serah_terima_kas_batal_check",
      sql`(${t.dibatalkanAt} IS NULL AND ${t.dibatalkanOleh} IS NULL AND ${t.alasanBatal} IS NULL)
        OR (${t.dibatalkanAt} IS NOT NULL AND ${t.dibatalkanOleh} IS NOT NULL AND ${t.alasanBatal} IS NOT NULL)`,
    ),
  ],
);
