import { z } from "zod";
import { nomorHpSchema } from "./auth";

/**
 * OPERASI LAPANGAN KOLEKTOR (aplikasi HP) — absen, akad, setoran, lunas,
 * gulung, libur. Aturan angka: docs/aturan-usaha.md.
 */

const rupiah = z.number().int().min(0);
export const jenisPinjamanSchema = z.enum(["harian", "mingguan", "tempoan"]);
const jenisPinjaman = jenisPinjamanSchema;

/** `POST /lapangan/absen` — sekali sehari. */
export const absenSchema = z.discriminatedUnion("absensi", [
  z.object({
    absensi: z.literal("masuk_kerja"),
    /** Modal tunai yang diberikan bos untuk dibawa ke lapangan. */
    kasLapangan: rupiah,
    uangJalan: rupiah,
  }),
  z.object({
    absensi: z.literal("tidak_kerja"),
    alasan: z.string().trim().min(1).max(100),
  }),
]);
export type AbsenInput = z.infer<typeof absenSchema>;

export const hariKolektorSchema = z.object({
  tanggal: z.string(),
  absensi: z.enum(["masuk_kerja", "tidak_kerja"]),
  kasLapangan: z.number(),
  uangJalan: z.number(),
  alasanTidakKerja: z.string().nullable(),
  /** Terisi = laporan dibuka, operasi lapangan berhenti hari ini. */
  laporanDibukaAt: z.string().nullable(),
});

/** Kampung nasabah baru: dipilih dari daftar, atau diketik (dibuat bila belum ada). */
export const kampungSchema = z.union([
  z.object({ wilayahId: z.uuid() }),
  z.object({ nama: z.string().trim().min(1).max(50) }),
]);

/** `POST /lapangan/akad` — orang baru atau nasabah lama yang meminjam lagi. */
/** Orang yang belum terdaftar — didaftarkan bersama akad / salinan pertamanya. */
export const nasabahBaruSchema = z.object({
  nama: z.string().trim().min(1).max(50),
  kampung: kampungSchema,
  nik: z
    .string()
    .regex(/^[0-9]{16}$/, "NIK 16 digit")
    .optional(),
  nomorHp: nomorHpSchema.optional(),
});
export type NasabahBaruInput = z.infer<typeof nasabahBaruSchema>;

export const akadSchema = z.object({
  nasabah: z.union([z.object({ nasabahId: z.uuid() }), nasabahBaruSchema]),
  jenis: jenisPinjaman,
  pokok: z.number().int().positive(),
  tenor: z.number().int().positive(),
  /** Foto nasabah memegang uang pencairan — diunggah lebih dulu (`POST /foto`). */
  fotoSerahTerimaId: z.uuid(),
});
export type AkadInput = z.infer<typeof akadSchema>;

/** Kartu pinjaman untuk layar kolektor. */
export const pinjamanSchema = z.object({
  id: z.uuid(),
  nasabah: z.object({ id: z.uuid(), nama: z.string(), kampung: z.string() }),
  pinjamanKe: z.number(),
  jenis: jenisPinjaman,
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

/** `POST /lapangan/bayar` — setoran angsuran. */
export const bayarSchema = z.object({
  pinjamanId: z.uuid(),
  setoranMurni: rupiah,
  /** Uang lebih untuk melunasi sebagian (bawaan 0). */
  setoranPelunasan: rupiah.default(0),
});

/** `POST /lapangan/lunas` — nominal dihitung server (tabungan menutup saldo lebih dulu). */
export const lunasSchema = z.object({ pinjamanId: z.uuid() });

/** `POST /lapangan/gulung` — pinjaman lama dilunasi pinjaman baru berjenis sama. */
export const gulungSchema = z.object({
  pinjamanId: z.uuid(),
  pokok: z.number().int().positive(),
  tenor: z.number().int().positive(),
  fotoSerahTerimaId: z.uuid(),
});

/** `POST /lapangan/libur` — pinjaman tidak ditagih hari ini. */
export const liburSchema = z.object({
  pinjamanId: z.uuid(),
  alasan: z.string().trim().min(1).max(100).optional(),
});

export const transaksiSchema = z.object({
  id: z.uuid(),
  pinjamanId: z.uuid(),
  tanggal: z.string(),
  jenis: z.enum(["angsuran", "pelunasan", "gulung"]),
  setoranMurni: z.number(),
  setoranPelunasan: z.number(),
  tabunganKeluar: z.number(),
  /** Uang setoran yang masuk; negatif bila tabungan melebihi saldo saat lunas. */
  storting: z.number(),
  saldoSesudah: z.number(),
});

export const hasilGulungSchema = z.object({
  transaksi: transaksiSchema,
  pinjamanBaru: pinjamanSchema,
});

export const liburTercatatSchema = z.object({
  id: z.uuid(),
  pinjamanId: z.uuid(),
  tanggal: z.string(),
  alasanLibur: z.string().nullable(),
});

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

/** `GET /lapangan/kampung` — pilihan kampung di formulir akad. */
export const kampungPilihanSchema = z.object({ id: z.uuid(), nama: z.string() });

/** `GET /lapangan/nasabah-lama` — pegangan tanpa pinjaman aktif, siap pinjam lagi. */
export const nasabahLamaSchema = z.object({
  id: z.uuid(),
  nama: z.string(),
  kampung: z.string(),
  tabungan: z.number(),
  terakhir: z
    .object({ pinjamanKe: z.number(), jenis: jenisPinjaman, pokok: z.number() })
    .nullable(),
});
export type NasabahLama = z.infer<typeof nasabahLamaSchema>;

/** `GET /lapangan/kalender?bulan=YYYY-MM` — kalender kantor sebulan (grid setoran kartu). */
export const saringKalenderBulanSchema = z.object({
  bulan: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Bulan YYYY-MM"),
});

export const kalenderBulanSchema = z.object({
  /** Hari tagih kantor (aturan-usaha B2): hari kerja pola pekan yang berlaku & bukan libur kantor. */
  hariTagih: z.array(z.string()),
  liburKantor: z.array(z.object({ tanggal: z.string(), alasan: z.string() })),
});
export type KalenderBulan = z.infer<typeof kalenderBulanSchema>;
