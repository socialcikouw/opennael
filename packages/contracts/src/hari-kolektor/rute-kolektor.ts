import { z } from "zod";
import { orang } from "../bersama/dasar";
import { kampungSchema } from "../kantor/wilayah";

/**
 * RUTE KOLEKTOR — urutan kampung yang didatangi; kartu tagihan disusun
 * mengikutinya. Diatur kolektor sendiri & bos, dijaga `versi`.
 * Docs: schema-rute.md.
 */

/** `GET /rute-kolektor` — kolektor: miliknya; bos & pengawas: sebut kolektornya. */
export const saringRuteSchema = z.object({ kolektorId: z.uuid().optional() });

export const ruteSchema = z.object({
  kolektorId: z.uuid(),
  /** Rute 1 lebih dulu. */
  urutan: z.array(z.object({ wilayahId: z.uuid(), nama: z.string() })),
  /** 0 = belum pernah diatur. */
  versi: z.number(),
  diubahOleh: orang.nullable(),
  diubahAt: z.string().nullable(),
});

/**
 * `PUT /rute-kolektor` — urutan utuh (kampung dipilih atau diketik);
 * `versi` = yang terakhir dibaca. Sudah ada yang menyimpan sesudahnya → 409.
 */
export const simpanRuteSchema = z.object({
  kolektorId: z.uuid().optional(),
  urutan: z.array(kampungSchema).max(200),
  versi: z.number().int().min(0),
});
export type SimpanRuteInput = z.infer<typeof simpanRuteSchema>;
