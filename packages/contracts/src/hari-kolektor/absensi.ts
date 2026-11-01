import { ATURAN_KAS_PAGI } from "@opennael/domain";
import { z } from "zod";
import { teksKecil } from "../bersama/dasar";

/**
 * ABSENSI KOLEKTOR (aplikasi HP) — absen pagi, keadaan hari ini.
 * Aturan: docs/aturan-usaha.md (C, I0).
 */

/** I0: kas lapangan / uang jalan saat masuk kerja — wajib, minimal & kelipatan Rp 5.000. */
export const nominalKasPagi = z
  .number({ error: "Wajib diisi" })
  .int()
  .min(ATURAN_KAS_PAGI.minimal, "Minimal Rp 5.000")
  .multipleOf(ATURAN_KAS_PAGI.kelipatan, "Harus kelipatan Rp 5.000");

/** `POST /lapangan/absen` — sekali sehari. */
export const absenSchema = z.discriminatedUnion("absensi", [
  z.object({
    absensi: z.literal("masuk_kerja"),
    /** Modal tunai yang diberikan bos untuk dibawa ke lapangan. */
    kasLapangan: nominalKasPagi,
    uangJalan: nominalKasPagi,
  }),
  z.object({
    absensi: z.literal("tidak_kerja"),
    alasan: teksKecil(100),
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
