import { sql } from "drizzle-orm";
import {
  char,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { kantor } from "./kantor";
import { cekLokasi, lokasi, waktu } from "./kolom";
import { pengguna } from "./pengguna";

export const jenisFotoEnum = pgEnum("jenis_foto", ["serah_terima", "ktp"]);

/**
 * FOTO — DATA satu foto bukti; berkasnya di penyimpanan berkas, bukan di
 * database. Pemilik foto (`pinjaman.foto_serah_terima_id`,
 * `nasabah.foto_ktp_id`) menunjuk ke sini. Foto kembar (sidik jari sama)
 * ditolak per kantor. Lihat docs/skema/schema-foto.md.
 */
export const foto = pgTable(
  "foto",
  {
    id: uuid().primaryKey().defaultRandom(),
    kantorId: uuid().notNull(),
    jenis: jenisFotoEnum().notNull(),
    /** Lokasi berkas di penyimpanan — bukan URL publik. */
    kunciBerkas: varchar({ length: 200 }).notNull(),
    /** SHA-256 hex isi berkas, dihitung server. */
    sha256: char({ length: 64 }).notNull(),
    ukuranByte: integer().notNull(),
    /** Diperiksa dari isi berkas: image/jpeg atau image/webp. */
    tipeMime: varchar({ length: 20 }).notNull(),
    /** GPS saat foto diambil. */
    ...lokasi(),
    /** Jam HP saat memotret — pembanding saja (bisa dimundurkan). */
    diambilAt: waktu(),
    diunggahOleh: uuid().notNull(),
    /** Jam SERVER saat unggah — yang dipercaya. */
    dibuatAt: waktu().notNull().defaultNow(),
  },
  (t) => [
    foreignKey({ name: "foto_kantor_fk", columns: [t.kantorId], foreignColumns: [kantor.id] }),
    foreignKey({
      name: "foto_diunggah_oleh_fk",
      columns: [t.diunggahOleh, t.kantorId],
      foreignColumns: [pengguna.id, pengguna.kantorId],
    }),
    unique("uniq_foto_id_kantor").on(t.id, t.kantorId),
    unique("uniq_foto_kantor_sha256").on(t.kantorId, t.sha256),
    index("idx_foto_dibuat").on(t.dibuatAt),
    check("foto_ukuran_check", sql`${t.ukuranByte} > 0 AND ${t.ukuranByte} <= 2000000`),
    check("foto_sha256_check", sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
    check("foto_lokasi_check", cekLokasi(t)),
  ],
);
