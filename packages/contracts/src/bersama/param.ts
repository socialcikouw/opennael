import { z } from "zod";

/** Parameter jalur yang dipakai banyak rute (`/…/{id}` dan sejenisnya). */
export const idParamSchema = z.object({ id: z.uuid() });
export const kolektorIdParamSchema = z.object({ kolektorId: z.uuid() });
export const nasabahIdParamSchema = z.object({ nasabahId: z.uuid() });
export const tanggalParamSchema = z.object({ tanggal: z.iso.date() });
