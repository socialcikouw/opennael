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
  /** Waktu akad (ISO) untuk jam di kartu HP; null untuk salinan migrasi (jam akad aslinya tak diketahui). */
  waktuAkad: z.string().nullable(),
  /**
   * Tempoan (aturan-usaha A4): hari masuk kerja ke-6 kolektor pemegang sesudah akad;
   * null = belum sampai, atau bukan tempoan. Dihitung dari absen, bukan disimpan.
   */
  jatuhTempo: z.string().nullable(),
  /** Tempoan: batas lunas = hari masuk kerja ke-10 (janji besok habis); null = belum sampai. */
  batasTempo: z.string().nullable(),
  /** Tempoan: hari masuk kerja pemegang sejak akad s/d hari ini (hari ke-N); jenis lain 0. */
  hariTempo: z.number(),
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

const bilahPortofolioSchema = z.object({
  jumlah: z.number(),
  saldo: z.number(),
  /** Σ angsuran (harian per hari, mingguan per minggu, tempoan sekali bayar) — 27 Nov 2026. */
  angsuran: z.number(),
  /** Σ saldo tabungan nasabahnya (nasabah hanya punya satu pinjaman aktif) — 27 Nov 2026. */
  tabungan: z.number(),
});

/**
 * Pegangan satu jenis pinjaman per status: banyaknya pinjaman, Σ saldo, Σ angsuran, Σ
 * tabungan nasabah; `lunas` = banyaknya pinjaman lunas & Σ pokoknya sepanjang masa
 * (27–28 Nov 2026); `penyelesaian` = cara piutang selesai selain dilunasi (28 Nov 2026).
 */
export const portofolioJenisSchema = z.object({
  berjalan: bilahPortofolioSchema,
  macet: bilahPortofolioSchema,
  diputihkan: bilahPortofolioSchema,
  lunas: z.object({
    jumlah: z.number(),
    /** Σ pokok pinjaman berstatus lunas — yang digulung tidak termasuk. */
    pokok: z.number(),
  }),
  penyelesaian: z.object({
    /** Σ pengurangan pokok karena gulung turun (E), pinjaman yang tidak batal. */
    pokokBerkurang: z.number(),
    /** Σ tabungan keluar (pelunasan ditutup tabungan, D) dari setoran berlaku. */
    tabunganKeluar: z.number(),
  }),
});
export type PortofolioJenis = z.infer<typeof portofolioJenisSchema>;

/**
 * `GET /lapangan/buku` — BUKU kolektor (28 Nov 2026): SEMUA nasabah pegangan (pernah meminjam,
 * pinjaman batal tak dihitung), satu baris per nasabah dengan pinjaman terbarunya dan
 * banyaknya pinjaman — ringan, tanpa batas baris yang memotong indeks abjad.
 */
export const indeksBukuSchema = z.object({
  nasabah: z.object({ id: z.uuid(), nama: z.string(), kampung: z.string() }),
  jumlahPinjaman: z.number(),
  terakhir: z.object({
    id: z.uuid(),
    pinjamanKe: z.number(),
    jenis: jenisPinjamanSchema,
    status: z.enum(["berjalan", "macet", "lunas", "digulung", "diputihkan"]),
    pokok: z.number(),
    saldo: z.number(),
    tanggalAkad: z.string(),
    tanggalSelesai: z.string().nullable(),
  }),
});
export type IndeksBuku = z.infer<typeof indeksBukuSchema>;

/** Potret posisi satu jenis pada satu tanggal (`posisi_harian`, sapuan tutup hari). */
export const potretJenisSchema = z.object({
  jumlahBerjalan: z.number(),
  jumlahMacet: z.number(),
  saldoBerjalan: z.number(),
  saldoMacet: z.number(),
  angsuranBerjalan: z.number(),
  angsuranMacet: z.number(),
});

/** Arus satu jenis dalam satu rentang (pegangan sekarang). */
export const arusJenisSchema = z.object({
  /** Pinjaman yang lunas (tanggal selesai) & Σ pokoknya. */
  lunas: z.number(),
  pokokLunas: z.number(),
  /** Pinjaman yang menjadi macet (tanggal macet). */
  macetBaru: z.number(),
  /** Σ tabungan keluar setoran berlaku. */
  tabunganKeluar: z.number(),
  /** Σ pengurangan pokok gulung turun (tanggal akad penerus). */
  pokokBerkurang: z.number(),
});

const perJenis = <T extends z.ZodType>(s: T) => z.object({ harian: s, mingguan: s, tempoan: s });

/**
 * Pembanding Portofolio (28 Nov 2026, delta bulan ini vs bulan lalu): POSISI dibanding potret
 * akhir bulan lalu (potret terakhir bulan itu; null bila belum ada), ARUS bulan ini (1 s/d hari
 * ini) dibanding rentang sepadan bulan lalu (1 s/d tanggal yang sama, dipangkas ke akhir bulan).
 */
export const pembandingPortofolioSchema = z.object({
  tanggalPotret: z.string().nullable(),
  potret: perJenis(potretJenisSchema).nullable(),
  bulanIni: z.object({ mulai: z.string(), selesai: z.string(), arus: perJenis(arusJenisSchema) }),
  bulanLalu: z.object({ mulai: z.string(), selesai: z.string(), arus: perJenis(arusJenisSchema) }),
});
export type PembandingPortofolio = z.infer<typeof pembandingPortofolioSchema>;
export type PotretJenis = z.infer<typeof potretJenisSchema>;
export type ArusJenis = z.infer<typeof arusJenisSchema>;

/**
 * `GET /lapangan/portofolio` — pegangan kolektor per jenis lalu per status.
 * `diputihkan` = seluruh riwayat (saldo tak disentuh pemutihan, jadi angkanya
 * nilai yang dihapus). Dipecah per jenis supaya Dasbor HP mengikuti mode tanpa
 * permintaan ulang. Docs: schema-pinjaman.md.
 */
export const portofolioSchema = z.object({
  harian: portofolioJenisSchema,
  mingguan: portofolioJenisSchema,
  tempoan: portofolioJenisSchema,
  /** Delta bulan ini vs bulan lalu (28 Nov 2026). */
  pembanding: pembandingPortofolioSchema,
});
export type Portofolio = z.infer<typeof portofolioSchema>;

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
