import { z } from "zod";
import { orang, tanggal } from "../bersama/dasar";
import { akunKasSchema } from "../kas";

/**
 * GAJI KOLEKTOR (web bos) — pratinjau, bayar, batal, riwayat slip. Rumus:
 * docs/aturan-usaha.md bagian J; tabel: docs/skema/schema-pembayaran-gaji.md.
 */

/** `GET /kas/gaji/pratinjau` */
export const saringPratinjauGajiSchema = z.object({
  kolektorId: z.uuid(),
  mulai: tanggal,
  selesai: tanggal,
});

export const pratinjauGajiSchema = z.object({
  kolektor: orang,
  periodeMulai: z.string(),
  periodeSelesai: z.string(),
  /** Hari yang punya storting atau tekor. */
  hari: z.array(
    z.object({
      tanggal: z.string(),
      storting: z.number(),
      tarifBp: z.number(),
      tekor: z.number(),
    }),
  ),
  /** Σ storting × tarif ÷ 10.000, dibulatkan sekali per periode (J1). */
  gajiKotor: z.number(),
  potonganTekor: z.number(),
  gajiBersih: z.number(),
  /** Kenapa belum bisa dibayar (kode galat), atau null. */
  halangan: z
    .enum([
      "PERIODE_BELUM_BERAKHIR",
      "PERIODE_SUDAH_DIBAYAR",
      "TEKOR_MELEBIHI_GAJI",
      "GAJI_KOTOR_MINUS",
    ])
    .nullable(),
});

/** `POST /kas/gaji` — angka dihitung & dibekukan server. */
export const bayarGajiSchema = z.object({
  kolektorId: z.uuid(),
  periodeMulai: tanggal,
  periodeSelesai: tanggal,
  dariAkun: akunKasSchema,
  keterangan: z.string().trim().min(1).max(200).optional(),
});
export type BayarGajiInput = z.infer<typeof bayarGajiSchema>;

export const slipGajiSchema = z.object({
  id: z.uuid(),
  kolektor: orang,
  periodeMulai: z.string(),
  periodeSelesai: z.string(),
  gajiKotor: z.number(),
  potonganTekor: z.number(),
  gajiBersih: z.number(),
  dariAkun: akunKasSchema,
  tanggalBayar: z.string(),
  keterangan: z.string().nullable(),
  dibuatAt: z.string(),
  dibatalkanAt: z.string().nullable(),
  alasanBatal: z.string().nullable(),
});

/** `GET /kas/gaji` — kolektor: miliknya. */
export const saringSlipGajiSchema = z.object({ kolektorId: z.uuid().optional() });
