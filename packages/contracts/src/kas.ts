import { z } from "zod";
import { orang, rupiah, tanggal } from "./bersama/dasar";

/**
 * KAS KANTOR (web bos; pencocokan juga pengawas) — buku kas, mutasi tangan,
 * laporan, pencocokan kas hitung buta. Tabel: docs/skema/schema-buku-kas.md,
 * schema-mutasi-kas-kantor.md, schema-pencocokan-kas.md.
 */

export const akunKasSchema = z.enum(["tunai", "bank"]);
export const jenisMutasiKasSchema = z.enum([
  "setor_modal",
  "tarik_modal",
  "biaya_kantor",
  "pindah_akun",
  "lain_masuk",
  "lain_keluar",
]);

/** Rentang tanggal; tanpa isian = hari ini (kalender kantor). */
export const saringRentangSchema = z.object({
  mulai: tanggal.optional(),
  selesai: tanggal.optional(),
});

// ---- buku kas ---------------------------------------------------------------

/** `POST /kas/buka` — sekali; tanggal buka = hari ini. */
export const bukaKasSchema = z.object({ tunai: rupiah, bank: rupiah });
export type BukaKasInput = z.infer<typeof bukaKasSchema>;

/** `PATCH /kas/buka` — betulkan kas awal, hanya di hari pembukaan. */
export const ubahKasAwalSchema = z
  .object({ tunai: rupiah.optional(), bank: rupiah.optional() })
  .refine((v) => v.tunai !== undefined || v.bank !== undefined, "Isi tunai atau bank");
export type UbahKasAwalInput = z.infer<typeof ubahKasAwalSchema>;

export const bukuKasSchema = z.object({
  tanggalBuka: z.string(),
  kasAwalTunai: z.number(),
  kasAwalBank: z.number(),
  dibukaAt: z.string(),
});

// ---- mutasi kas kantor ------------------------------------------------------

/** `POST /kas/mutasi` — hari ini; akun mengikuti arah jenisnya. */
export const mutasiInputSchema = z.object({
  jenis: jenisMutasiKasSchema,
  dariAkun: akunKasSchema.nullish(),
  keAkun: akunKasSchema.nullish(),
  nominal: z.number().int().positive(),
  keterangan: z.string().trim().min(1).max(200),
});
export type MutasiInput = z.infer<typeof mutasiInputSchema>;

export const mutasiSchema = z.object({
  id: z.uuid(),
  tanggal: z.string(),
  jenis: jenisMutasiKasSchema,
  dariAkun: akunKasSchema.nullable(),
  keAkun: akunKasSchema.nullable(),
  nominal: z.number(),
  keterangan: z.string(),
  dibuatAt: z.string(),
  dibatalkanAt: z.string().nullable(),
  alasanBatal: z.string().nullable(),
});

// ---- laporan kas (bos) ------------------------------------------------------

const ringkasAkunSchema = z.object({
  saldoAwal: z.number(),
  masuk: z.number(),
  keluar: z.number(),
  saldoAkhir: z.number(),
});

/** Satu gerakan uang di buku kas — dibaca langsung dari tabel asalnya. */
export const gerakanKasSchema = z.object({
  tanggal: z.string(),
  akun: akunKasSchema,
  /** Plus = masuk ke akun; minus = keluar. */
  nominal: z.number(),
  sumber: z.enum([
    "mutasi",
    "serah_terima",
    "transfer_setoran",
    "transfer_lama",
    "penarikan_tabungan",
    "pembayaran_gaji",
  ]),
  sumberId: z.string(),
  /** Jenis mutasi, bila sumbernya mutasi. */
  jenis: jenisMutasiKasSchema.nullable(),
  keterangan: z.string().nullable(),
});

export const laporanKasSchema = z.object({
  /** null = buku kas belum dibuka. */
  bukuKas: bukuKasSchema.nullable(),
  mulai: z.string(),
  selesai: z.string(),
  tunai: ringkasAkunSchema,
  bank: ringkasAkunSchema,
  /** Saat ini: kas lapangan + uang jalan kolektor yang belum diserahterimakan. */
  kasDiLapangan: z.number(),
  /** Saat ini: saldo tunai − kas di lapangan — yang seharusnya ada di brankas. */
  brankasSeharusnya: z.number(),
  gerakan: z.array(gerakanKasSchema),
});

// ---- pencocokan kas -----------------------------------------------------------

/** `POST /kas/pencocokan` — HITUNG BUTA: saldo buku dijawab sesudah tersimpan. */
export const pencocokanInputSchema = z.object({
  akun: akunKasSchema,
  saldoNyata: rupiah,
  keterangan: z.string().trim().min(1).max(200).optional(),
});
export type PencocokanInput = z.infer<typeof pencocokanInputSchema>;

export const pencocokanSchema = z.object({
  id: z.uuid(),
  tanggal: z.string(),
  akun: akunKasSchema,
  saldoBuku: z.number(),
  saldoNyata: z.number(),
  /** Minus = kurang; plus = lebih. */
  selisih: z.number(),
  keterangan: z.string().nullable(),
  dicocokkanOleh: orang,
  dibuatAt: z.string(),
  dibatalkanAt: z.string().nullable(),
  alasanBatal: z.string().nullable(),
});

// ---- posisi modal (bos) ------------------------------------------------------

/** `GET /kas/posisi-modal?tanggal=` — tanpa tanggal = hari ini. */
export const saringPosisiModalSchema = z.object({ tanggal: tanggal.optional() });

/**
 * Posisi modal pada akhir tanggal itu (aturan-usaha M). null = belum bisa
 * dihitung: buku kas belum dibuka, atau tanggal lampau tanpa potret piutang.
 */
export const posisiModalSchema = z.object({
  tanggal: z.string(),
  saldoTunai: z.number().nullable(),
  /** Rincian saldo tunai: yang sedang dibawa kolektor & yang di brankas. */
  kasDiLapangan: z.number().nullable(),
  diBrankas: z.number().nullable(),
  saldoBank: z.number().nullable(),
  piutangBerjalan: z.number().nullable(),
  /** Bagian berisiko, ditampilkan terpisah; yang diputihkan tak dihitung. */
  piutangMacet: z.number().nullable(),
  tabunganNasabah: z.number(),
  posisiModal: z.number().nullable(),
});
