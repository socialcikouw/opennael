import { z } from "zod";
import { orang } from "../bersama/dasar";
import { peranSchema } from "./auth";

/**
 * PERANGKAT — HP / browser yang sedang masuk. Bos: seluruh kantor (dan
 * riwayatnya); peran lain: miliknya. Memutus: bos perangkat mana pun di
 * kantornya, pengguna miliknya sendiri. Docs: schema-perangkat.md.
 */

/** `GET /auth/perangkat` — `termasukDiputus=true` (bos): riwayat juga. */
export const saringPerangkatSchema = z.object({
  termasukDiputus: z.enum(["true", "false"]).optional(),
});

export const perangkatSchema = z.object({
  id: z.uuid(),
  pengguna: orang.extend({ peran: peranSchema }),
  nama: z.string().nullable(),
  platform: z.enum(["android", "ios", "web"]).nullable(),
  terakhirAktifAt: z.string(),
  kedaluwarsaAt: z.string(),
  dibuatAt: z.string(),
  /** Perangkat yang dipakai untuk permintaan ini. */
  sedangDipakai: z.boolean(),
  diputus: z
    .object({
      at: z.string(),
      oleh: orang.nullable(),
      alasan: z.enum([
        "keluar",
        "diputus",
        "ganti_sandi",
        "tautan_baru",
        "dinonaktifkan",
        "pakai_ulang",
        "kedaluwarsa",
      ]),
    })
    .nullable(),
});
export type PerangkatJawaban = z.infer<typeof perangkatSchema>;

/** `DELETE /auth/perangkat/{id}` — perangkat yang diputus dan sebabnya. */
export const perangkatDiputusSchema = z.object({
  id: z.uuid(),
  alasan: z.enum(["keluar", "diputus"]),
});
