import { z } from "zod";
import { orang, tanggal } from "../bersama/dasar";

/**
 * RINGKASAN (web bos; pengawas & kolektor membaca miliknya) — angka satu
 * rentang tanggal, per kolektor, dan deret performa penagihan harian
 * (aturan-usaha N). Semua dari catatan berlaku; yang batal tidak dihitung.
 */

/** Rentang; tanpa isian = hari ini. Kolektor selalu dibatasi ke dirinya. */
export const saringRingkasanSchema = z.object({
  mulai: tanggal.optional(),
  selesai: tanggal.optional(),
  kolektorId: z.uuid().optional(),
});

export const angkaRingkasanSchema = z.object({
  /** Setoran dari nasabah — menurut pencatat & tanggal transaksi. */
  penagihan: z.object({
    jumlahSetoran: z.number(),
    setoranMurni: z.number(),
    setoranPelunasan: z.number(),
    tabunganKeluar: z.number(),
    /** murni + pelunasan − tabungan keluar. */
    storting: z.number(),
  }),
  /** Akad (bukan salinan migrasi) — menurut pencair & tanggal akad. */
  akad: z.object({
    jumlahAkad: z.number(),
    droping: z.number(),
    dropBaru: z.number(),
    dropGulung: z.number(),
    pokokBerkurang: z.number(),
    potonganAdmin: z.number(),
    tabunganMasuk: z.number(),
    pencairan: z.number(),
  }),
  /** Hari kolektor & setoran sore. */
  kasLapangan: z.object({
    hariKerja: z.number(),
    kasLapangan: z.number(),
    uangJalan: z.number(),
    transfer: z.number(),
    biayaTakTerduga: z.number(),
    tunaiDiterima: z.number(),
    tekor: z.number(),
    lebihSetor: z.number(),
  }),
});

export const ringkasanSchema = angkaRingkasanSchema.extend({
  mulai: z.string(),
  selesai: z.string(),
});

export const ringkasanKolektorSchema = angkaRingkasanSchema.extend({ kolektor: orang });

/** `GET /ringkasan/performa` — paling panjang 366 hari. */
export const performaHarianSchema = z.object({
  tanggal: z.string(),
  setoranMurni: z.number(),
  /** Angsuran berjalan harian akhir kemarin − angsuran mati hari ini; null = belum ada potret. */
  patokan: z.number().nullable(),
  persentase: z.number().nullable(),
});
