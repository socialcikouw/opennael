import { z } from "zod";
import { orang, rupiah } from "../bersama/dasar";
import { akunKasSchema } from "../kas";

/**
 * TABUNGAN NASABAH (web bos) — penarikan (uang sungguhan, kas keluar) dan
 * koreksi (membetulkan angka, tanpa uang). `saldoSebelum` = angka yang
 * dilihat bos di layar; berbeda dengan database → `TABUNGAN_BERUBAH`.
 * Tabel: docs/skema/schema-penarikan-tabungan.md, schema-koreksi-tabungan.md.
 */

/** `POST /nasabah/:id/penarikan-tabungan` */
export const penarikanInputSchema = z.object({
  nominal: z.number().int().positive(),
  dariAkun: akunKasSchema,
  saldoSebelum: rupiah,
  alasan: z.string().trim().min(1).max(200),
});
export type PenarikanInput = z.infer<typeof penarikanInputSchema>;

export const penarikanSchema = z.object({
  id: z.uuid(),
  nasabahId: z.uuid(),
  tanggal: z.string(),
  nominal: z.number(),
  dariAkun: akunKasSchema,
  saldoSebelum: z.number(),
  alasan: z.string(),
  dibuatOleh: orang,
  dibuatAt: z.string(),
  dibatalkanAt: z.string().nullable(),
  alasanBatal: z.string().nullable(),
});

/** `POST /nasabah/:id/koreksi-tabungan` */
export const koreksiInputSchema = z.object({
  saldoBaru: rupiah,
  saldoSebelum: rupiah,
  alasan: z.string().trim().min(1).max(200),
});
export type KoreksiInput = z.infer<typeof koreksiInputSchema>;

export const koreksiSchema = z.object({
  id: z.uuid(),
  nasabahId: z.uuid(),
  tanggal: z.string(),
  saldoSebelum: z.number(),
  selisih: z.number(),
  saldoSesudah: z.number(),
  alasan: z.string(),
  dibuatOleh: orang,
  dibuatAt: z.string(),
});
