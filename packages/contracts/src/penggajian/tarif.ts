import { z } from "zod";
import { orang, tanggal } from "../bersama/dasar";

/**
 * TARIF GAJI — persen storting kantor / khusus kolektor, bertanggal.
 * Docs: schema-tarif-gaji.md.
 */

/**
 * `PUT /tarif-gaji` — tanpa `kolektorId` = tarif kantor (wajib berpersen);
 * dengan `kolektorId`, `tarifBp: null` = kembali ikut tarif kantor.
 */
export const tarifInputSchema = z.object({
  kolektorId: z.uuid().optional(),
  tarifBp: z.number().int().min(0).max(10_000).nullable(),
  berlakuMulai: tanggal.optional(),
});
export type TarifInput = z.infer<typeof tarifInputSchema>;

export const tarifSchema = z.object({
  id: z.uuid(),
  kolektor: orang.nullable(),
  tarifBp: z.number().nullable(),
  berlakuMulai: z.string(),
});

export const saringTarifBerlakuSchema = z.object({ kolektorId: z.uuid().optional() });

export const tarifBerlakuSchema = z.object({
  tarifBp: z.number(),
  sumber: z.enum(["kolektor", "kantor"]),
});
