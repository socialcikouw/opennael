import { sql } from "drizzle-orm";
import { check, foreignKey, index, pgTable, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { waktu } from "./kolom";
import { pengguna } from "./pengguna";
import { perangkat, platformPerangkatEnum } from "./perangkat";

/**
 * TAUTAN — satu permintaan penautan HP lewat QR; satu-satunya jalan masuk
 * kasir, pengawas, dan kolektor (tanpa kata sandi). Umurnya pendek: menunggu
 * 2 menit, sesudah disetujui 10 menit, dihapus sehari sesudah kedaluwarsa.
 * Status DITURUNKAN (menunggu / disetujui / terpakai / kedaluwarsa), tidak
 * disimpan. Lihat docs/skema/schema-tautan.md.
 */
export const tautan = pgTable(
  "tautan",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** 8 huruf/angka tanpa yang mirip; tampil "K7QM-28XD". */
    kode: varchar({ length: 8 }).notNull(),
    /** SHA-256 hex kunci klaim milik HP peminta (kuncinya sendiri tak disimpan). */
    hashKlaim: varchar({ length: 64 }).notNull(),
    nama: varchar({ length: 100 }),
    platform: platformPerangkatEnum(),
    kedaluwarsaAt: waktu().notNull(),
    /** Kosong selama menunggu — HP belum tahu kantornya. */
    kantorId: uuid(),
    penggunaId: uuid(),
    disetujuiAt: waktu(),
    disetujuiOleh: uuid(),
    /** Terisi = sudah dipakai. */
    perangkatId: uuid(),
    dibuatAt: waktu().notNull().defaultNow(),
  },
  (t) => [
    unique("uniq_tautan_kode").on(t.kode),
    foreignKey({ name: "tautan_kantor_fk", columns: [t.kantorId], foreignColumns: [kantor.id] }),
    foreignKey({
      name: "tautan_pengguna_fk",
      columns: [t.penggunaId, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "tautan_disetujui_oleh_fk",
      columns: [t.disetujuiOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    foreignKey({
      name: "tautan_perangkat_fk",
      columns: [t.perangkatId],
      foreignColumns: [perangkat.id],
    }),
    index("idx_tautan_kedaluwarsa").on(t.kedaluwarsaAt),
    check(
      "tautan_setuju_check",
      sql`(${t.kantorId} IS NULL AND ${t.penggunaId} IS NULL AND ${t.disetujuiAt} IS NULL AND ${t.disetujuiOleh} IS NULL)
        OR (${t.kantorId} IS NOT NULL AND ${t.penggunaId} IS NOT NULL AND ${t.disetujuiAt} IS NOT NULL AND ${t.disetujuiOleh} IS NOT NULL)`,
    ),
    check("tautan_pakai_check", sql`${t.perangkatId} IS NULL OR ${t.disetujuiAt} IS NOT NULL`),
  ],
);
