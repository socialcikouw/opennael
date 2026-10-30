import { z } from "zod";

/**
 * PROFIL KANTOR (web bos; dibaca semua peran) — nama, zona waktu, jam kerja.
 * Docs: schema-kantor.md.
 */

const jam = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$|^24:00$/, "Jam HH:MM");

export const kantorSchema = z.object({
  id: z.uuid(),
  nama: z.string(),
  zonaWaktu: z.enum(["WIB", "WITA", "WIT"]),
  /** Pola yang berlaku hari ini. */
  hariKerja: z.array(z.number()),
  jamBuka: z.string(),
  jamTutup: z.string(),
});

/** `PATCH /kantor` — buka < tutup; "24:00" boleh untuk tutup. */
export const ubahKantorSchema = z
  .object({
    nama: z.string().trim().min(1).max(100).optional(),
    zonaWaktu: z.enum(["WIB", "WITA", "WIT"]).optional(),
    jamBuka: jam.optional(),
    jamTutup: jam.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Isi paling sedikit satu kolom");
export type UbahKantorInput = z.infer<typeof ubahKantorSchema>;
