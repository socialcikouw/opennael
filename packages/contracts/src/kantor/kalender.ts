import { z } from "zod";
import { orang, tanggal } from "../bersama/dasar";

/**
 * KALENDER KANTOR — pekan kerja bertanggal, libur kantor, kalender sebulan.
 * Docs: schema-pekan-kerja.md, schema-libur-kantor.md.
 */
/** Hari dalam pekan: 0 = Minggu … 6 = Sabtu. */
const hariKerja = z
  .array(z.number().int().min(0).max(6))
  .min(1, "Paling sedikit satu hari kerja")
  .refine((h) => new Set(h).size === h.length, "Hari tidak boleh kembar");

/** `GET /lapangan/kalender?bulan=YYYY-MM` — kalender kantor sebulan (grid setoran kartu). */
export const saringKalenderBulanSchema = z.object({
  bulan: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Bulan YYYY-MM"),
});

export const kalenderBulanSchema = z.object({
  /** Hari tagih kantor (aturan-usaha B2): hari kerja pola pekan yang berlaku & bukan libur kantor. */
  hariTagih: z.array(z.string()),
  liburKantor: z.array(z.object({ tanggal: z.string(), alasan: z.string() })),
});
export type KalenderBulan = z.infer<typeof kalenderBulanSchema>;

/** `PUT /kantor/pekan-kerja` — bawaan berlaku hari ini; tidak boleh mundur. */
export const pekanKerjaInputSchema = z.object({ hariKerja, berlakuMulai: tanggal.optional() });
export type PekanKerjaInput = z.infer<typeof pekanKerjaInputSchema>;

export const pekanKerjaSchema = z.object({
  berlakuMulai: z.string(),
  hariKerja: z.array(z.number()),
  dibuatOleh: orang,
});

export const saringLiburKantorSchema = z.object({
  tanggalMulai: tanggal.optional(),
  tanggalSelesai: tanggal.optional(),
});

/** `POST /libur-kantor` — rentang dipecah per tanggal; yang sudah ada dilewati. */
export const liburKantorInputSchema = z.object({
  tanggalMulai: tanggal,
  tanggalSelesai: tanggal.optional(),
  alasan: z.string().trim().min(1).max(100),
});
export type LiburKantorInput = z.infer<typeof liburKantorInputSchema>;

export const liburKantorSchema = z.object({ tanggal: z.string(), alasan: z.string() });

export const hasilLiburKantorSchema = z.object({
  ditambah: z.array(z.string()),
  dilewati: z.array(z.string()),
});
