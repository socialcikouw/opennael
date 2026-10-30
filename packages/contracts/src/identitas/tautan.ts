import { bakukanKode } from "@opennael/domain";
import { z } from "zod";
import { infoPerangkatSchema, nomorHpSchema, peranSchema, sesiSchema } from "./auth";

/** Ketikan bos ("k7qm-28xd") atau isi QR utuh → kode baku. */
export const kodeTautanSchema = z
  .string()
  .transform((teks, ctx) => {
    const kode = bakukanKode(teks);
    if (kode === null) {
      ctx.addIssue({ code: "custom", message: "Kode penautan tidak sah" });
      return z.NEVER;
    }
    return kode;
  })
  .meta({ example: "K7QM-28XD" });

/** `POST /auth/tautan` — HP yang belum masuk meminta kode. */
export const mintaTautanSchema = z.object({
  perangkat: infoPerangkatSchema.optional(),
});

export const tautanBaruSchema = z.object({
  /** Dipegang HP peminta untuk klaim. */
  id: z.uuid(),
  /** Tampilan "K7QM-28XD" — diketik bos bila kamera bermasalah. */
  kode: z.string(),
  /** Isi QR yang dipindai bos. */
  qr: z.string(),
  /** Kunci klaim — dikirim SEKALI, tidak ikut QR. Simpan hanya di HP ini. */
  klaim: z.string(),
  kedaluwarsaAt: z.iso.datetime(),
});

/** Peran yang bisa ditautkan (bos masuk dengan kata sandi). */
export const peranTertautSchema = z.enum(["kasir", "pengawas", "kolektor"]);

/** `POST /auth/tautan/setujui` — bos memilih akun yang ada atau membuat akun baru. */
export const setujuiTautanSchema = z.object({
  kode: kodeTautanSchema,
  akun: z.union([
    z.object({ penggunaId: z.uuid() }),
    z
      .object({
        peran: peranTertautSchema,
        nama: z.string().trim().min(1).max(50),
        nomorHp: nomorHpSchema.optional(),
        resort: z.string().trim().min(1).max(50).optional(),
      })
      .refine((a) => a.resort === undefined || a.peran === "kolektor", {
        message: "Resort hanya untuk kolektor",
        path: ["resort"],
      }),
  ]),
});
export type SetujuiTautanInput = z.infer<typeof setujuiTautanSchema>;

export const persetujuanTautanSchema = z.object({
  pengguna: z.object({ id: z.uuid(), nama: z.string(), peran: peranSchema }),
  perangkat: z.object({ nama: z.string().nullable(), platform: z.string().nullable() }),
});

/** `POST /auth/tautan/:id/klaim` — HP peminta bertanya (berulang) sampai disetujui. */
export const klaimTautanSchema = z.object({ klaim: z.string().min(1) });

export const hasilKlaimSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("menunggu") }),
  z.object({ status: z.literal("kedaluwarsa") }),
  sesiSchema.extend({ status: z.literal("tertaut") }),
]);
export type HasilKlaim = z.infer<typeof hasilKlaimSchema>;
