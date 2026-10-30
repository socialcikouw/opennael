import { z } from "zod";
import { orang } from "../bersama/dasar";

export const jenisPinjamanSchema = z.enum(["harian", "mingguan", "tempoan"]);

/** Kartu pinjaman untuk layar kolektor. */
export const pinjamanSchema = z.object({
  id: z.uuid(),
  nasabah: z.object({ id: z.uuid(), nama: z.string(), kampung: z.string() }),
  pinjamanKe: z.number(),
  jenis: jenisPinjamanSchema,
  tenor: z.number(),
  asal: z.enum(["baru", "gulung", "migrasi"]),
  status: z.enum(["berjalan", "macet", "lunas", "digulung", "batal", "diputihkan"]),
  tanggalAkad: z.string(),
  jatuhTempo: z.string().nullable(),
  pokok: z.number(),
  potonganAdmin: z.number(),
  tabunganMasuk: z.number(),
  /** Tunai yang diterima nasabah saat akad (gulung: bersih sesudah saldo lama). */
  pencairan: z.number(),
  totalKembali: z.number(),
  angsuran: z.number(),
  saldo: z.number(),
  /** Angsuran yang sudah lunas — nomor di kartu. */
  angsuranKe: z.number(),
  /** Foto serah terima (`GET /foto/:id`); kosong untuk salinan buku lama (migrasi). */
  fotoSerahTerimaId: z.uuid().nullable(),
  /** Uang baru yang keluar saat akad (E7); akad baru = pokok. */
  dropBaru: z.number(),
  /** Bagian pokok yang memutar pinjaman lama (gulung, E7); selain gulung 0. */
  dropGulung: z.number(),
  /** Gulung: naik · tetap · turun dibanding pokok asal; selain gulung null. */
  jenisGulung: z.enum(["naik", "tetap", "turun"]).nullable(),
});
export type PinjamanKartu = z.infer<typeof pinjamanSchema>;

/**
 * `GET /lapangan/pinjaman` — kartu di daftar tagih kolektor: kartu pinjaman +
 * tabungan nasabah (pratinjau lunas) + catatan hari ini (C3: satu peristiwa).
 * Lunas & gulung hari ini tidak tampil — pinjamannya sudah keluar daftar.
 */
export const kartuTagihSchema = pinjamanSchema.extend({
  tabungan: z.number(),
  /** Nomor urut kampung nasabah di rute kolektor ini (Rute 1, 2, …); null = belum diatur. */
  ruteKe: z.number().nullable(),
  hariIni: z
    .discriminatedUnion("jenis", [
      z.object({ jenis: z.literal("angsuran"), storting: z.number() }),
      z.object({ jenis: z.literal("libur"), alasan: z.string().nullable() }),
    ])
    .nullable(),
});
export type KartuTagih = z.infer<typeof kartuTagihSchema>;

/**
 * PINJAMAN — kartu & rincian untuk bos, pengawas, dan kolektor (pegangannya),
 * sunting nomor urut (bos), garis waktu status. Docs: schema-pinjaman.md,
 * schema-riwayat-status-pinjaman.md; posisi tagih: aturan-usaha B5.
 */

export const statusPinjamanSchema = pinjamanSchema.shape.status;

/** `GET /pinjaman` — bawaan pinjaman aktif (berjalan & macet). */
export const saringPinjamanSchema = z.object({
  status: z.enum(["aktif", "selesai", "semua"]).default("aktif"),
  nasabahId: z.uuid().optional(),
  /** Pemegang (bos & pengawas). */
  kolektorId: z.uuid().optional(),
});

/** B5 — tertinggal & tunggakan hari ini (hari ini belum dihitung lewat). */
export const posisiTagihSchema = z.object({
  tertinggal: z.number(),
  tunggakan: z.number(),
});

/** Rem gulung yang berlaku untuk nasabah ini (gabungan kantor, pemegang, nasabah). */
export const kunciGulungSchema = z.object({
  gulung: z.boolean(),
  naik: z.boolean(),
  alasan: z.string().nullable(),
});

export const kartuPinjamanSchema = pinjamanSchema.extend({
  /** Pemegang nasabah saat ini. */
  kolektor: orang,
  tanggalSelesai: z.string().nullable(),
  /** `null` bila pinjaman tidak aktif. */
  tagih: posisiTagihSchema.nullable(),
  kunciGulung: kunciGulungSchema.nullable(),
});
export type KartuPinjaman = z.infer<typeof kartuPinjamanSchema>;

/**
 * Aturan macet (aturan-usaha F) dengan jendela 30 hari yang berakhir hari ini
 * — yang akan dinilai sapuan malam ini bila tak ada setoran lagi.
 */
export const aturanMacetSchema = z.object({
  jendelaAwal: z.string(),
  jendelaAkhir: z.string(),
  setoranJendela: z.number(),
  /** Harian & mingguan: setoran minimal dalam jendela. */
  ambang: z.number().nullable(),
  /** Harian: hari tagih dalam jendela sejak mulai ditagih (dinilai bila ≥ 15). */
  hariTagih: z.number().nullable(),
  /** Tempoan: macet bila lewat tanggal ini (jatuh tempo + 7). */
  batasTempoan: z.string().nullable(),
  dievaluasi: z.boolean(),
  statusMalamIni: z.enum(["berjalan", "macet"]),
});

export const rincianPinjamanSchema = kartuPinjamanSchema.extend({
  pencair: orang,
  tanggalDisalin: z.string().nullable(),
  tanggalMacet: z.string().nullable(),
  pinjamanAsalId: z.uuid().nullable(),
  jenisGulung: z.enum(["tetap", "naik", "turun"]).nullable(),
  saldoLama: z.number(),
  saldoAwal: z.number(),
  dropBaru: z.number(),
  dropGulung: z.number(),
  pokokBerkurang: z.number(),
  fotoSerahTerimaId: z.uuid().nullable(),
  pemutihan: z
    .object({
      at: z.string(),
      alasan: z.enum(["macet_lama", "meninggal", "lainnya"]),
      keterangan: z.string().nullable(),
    })
    .nullable(),
  batal: z.object({ at: z.string(), alasan: z.string() }).nullable(),
  /** `null` bila pinjaman tidak aktif. */
  aturanMacet: aturanMacetSchema.nullable(),
});
export type RincianPinjaman = z.infer<typeof rincianPinjamanSchema>;

/** `PATCH /pinjaman/:id` — hanya nomor urut (identitas lewat `PATCH /nasabah/:id`). */
export const ubahPinjamanSchema = z.object({ pinjamanKe: z.number().int().positive() });

/** `GET /pinjaman/:id/riwayat-status` — satu perpindahan status. */
export const riwayatStatusSchema = z.object({
  id: z.uuid(),
  /** `null` = baris kelahiran pinjaman. */
  statusSebelum: statusPinjamanSchema.nullable(),
  statusSesudah: statusPinjamanSchema,
  tanggal: z.string(),
  dibuatAt: z.string(),
});
