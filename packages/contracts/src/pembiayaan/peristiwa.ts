import { z } from "zod";
import { orang, rupiah, tanggal } from "../bersama/dasar";
import { nasabahSchema } from "./nasabah";
import { jenisPinjamanSchema, kartuPinjamanSchema } from "./pinjaman";

/** `POST /lapangan/bayar` — setoran angsuran. */
export const bayarSchema = z.object({
  pinjamanId: z.uuid(),
  setoranMurni: rupiah,
  /** Uang lebih untuk melunasi sebagian (bawaan 0). */
  setoranPelunasan: rupiah.default(0),
});

/** `POST /lapangan/lunas` — nominal dihitung server (tabungan menutup saldo lebih dulu). */
export const lunasSchema = z.object({ pinjamanId: z.uuid() });

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

export const liburTercatatSchema = z.object({
  id: z.uuid(),
  pinjamanId: z.uuid(),
  tanggal: z.string(),
  alasanLibur: z.string().nullable(),
});

/**
 * PERISTIWA PINJAMAN — transaksi berlaku + libur nasabah dalam satu bentuk,
 * grid bulanan, satu transaksi, dan Buku nasabah. Kolektor: pinjaman
 * pegangannya. Docs: schema-transaksi.md, schema-libur-nasabah.md.
 */

export const kategoriPeristiwaSchema = z.enum(["angsuran", "pelunasan", "gulung", "libur"]);

/** `GET /transaksi/peristiwa` — tanpa `pinjamanId` wajib bertanggal (paling panjang 62 hari). */
export const saringPeristiwaSchema = z.object({
  pinjamanId: z.uuid().optional(),
  /** Pemegang (bos & pengawas). */
  kolektorId: z.uuid().optional(),
  jenis: jenisPinjamanSchema.optional(),
  tanggal: tanggal.optional(),
  tanggalMulai: tanggal.optional(),
  tanggalSelesai: tanggal.optional(),
});
export type SaringPeristiwa = z.infer<typeof saringPeristiwaSchema>;

export const peristiwaSchema = z.object({
  id: z.uuid(),
  pinjamanId: z.uuid(),
  nasabah: orang,
  pencatat: orang,
  tanggal: z.string(),
  kategori: kategoriPeristiwaSchema,
  setoranMurni: z.number(),
  setoranPelunasan: z.number(),
  tabunganKeluar: z.number(),
  storting: z.number(),
  /** Kosong untuk libur. */
  saldoSesudah: z.number().nullable(),
  /** Hanya libur. */
  alasanLibur: z.string().nullable(),
  dibuatAt: z.string(),
});
export type Peristiwa = z.infer<typeof peristiwaSchema>;

/** `GET /transaksi/rekap-bulanan` — isi grid kartu satu bulan. */
export const saringRekapBulananSchema = z.object({
  bulan: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Bulan YYYY-MM"),
  kolektorId: z.uuid().optional(),
});

export const selRekapSchema = z.object({
  pinjamanId: z.uuid(),
  tanggal: z.string(),
  kategori: kategoriPeristiwaSchema,
});

/** `GET /transaksi/:id` — termasuk yang dibatalkan. */
export const transaksiLengkapSchema = transaksiSchema.extend({
  pencatat: orang,
  dibuatAt: z.string(),
  dibatalkan: z.object({ at: z.string(), oleh: orang, alasan: z.string() }).nullable(),
});

/** `GET /nasabah/:id/buku` */
export const bukuNasabahSchema = z.object({
  nasabah: nasabahSchema,
  /** Termasuk yang batal, urut `pinjamanKe`. */
  pinjaman: z.array(kartuPinjamanSchema),
  /** Peristiwa berlaku semua pinjaman di atas, urut tanggal. */
  peristiwa: z.array(peristiwaSchema),
});
