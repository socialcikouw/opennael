import { z } from "zod";
import { orang } from "../bersama/dasar";

/**
 * KEBIJAKAN (REM BOS) — tiga lapis: kantor, kolektor, nasabah.
 * Docs: schema-kebijakan.md.
 */

/** `PUT /kebijakan/kantor` & `/kebijakan/kolektor/:id` — semua mati = rem dilepas. */
export const remInputSchema = z.object({
  pinjamanBaruDikunci: z.boolean(),
  naikPinjamanDikunci: z.boolean(),
  gulungPinjamanDikunci: z.boolean(),
  alasanKunci: z.string().trim().min(1).max(100).nullish(),
});
export type RemInput = z.infer<typeof remInputSchema>;

/** `PUT /kebijakan/nasabah/:id` — tanpa saklar pinjaman baru (urusan blokir). */
export const remNasabahInputSchema = remInputSchema.omit({ pinjamanBaruDikunci: true });
export type RemNasabahInput = z.infer<typeof remNasabahInputSchema>;

/** Rem yang berlaku bagi pembaca (kolektor: gabungan kantor + dirinya). */
export const remBerlakuSchema = z.object({
  pinjamanBaruDikunci: z.boolean(),
  naikPinjamanDikunci: z.boolean(),
  gulungPinjamanDikunci: z.boolean(),
  alasanKunci: z.string().nullable(),
});

/** Satu rem yang menyala, dengan lapis & sasarannya. */
export const remAktifSchema = z.object({
  lapis: z.enum(["kantor", "kolektor", "nasabah"]),
  sasaran: orang.nullable(),
  pinjamanBaruDikunci: z.boolean(),
  naikPinjamanDikunci: z.boolean(),
  gulungPinjamanDikunci: z.boolean(),
  alasanKunci: z.string().nullable(),
  diubahOleh: orang,
});
