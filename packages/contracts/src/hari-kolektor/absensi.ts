import { z } from "zod";
import { rupiah } from "../bersama/dasar";

/**
 * ABSENSI KOLEKTOR (aplikasi HP) — absen pagi, keadaan hari ini.
 * Aturan: docs/aturan-usaha.md (C).
 */

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

/** `GET /lapangan/hari-ini` — kalender kantor seperti dilihat gerbang + absensi kolektor hari ini. */
export const keadaanHariIniSchema = z.object({
  kalender: z.object({
    tanggal: z.string(),
    dalamJamKerja: z.boolean(),
    hariKerja: z.boolean(),
    liburKantor: z.string().nullable(),
  }),
  hari: hariKolektorSchema.nullable(),
});
