import { bakukanNomorHp } from "@opennael/domain";
import { z } from "zod";

/** Nomor HP yang diketik → E.164 (`0812…` menjadi `+62812…`). */
export const nomorHpSchema = z
  .string()
  .transform((teks, ctx) => {
    const baku = bakukanNomorHp(teks);
    if (baku === null) {
      ctx.addIssue({ code: "custom", message: "Nomor HP tidak sah" });
      return z.NEVER;
    }
    return baku;
  })
  .meta({ example: "081234567890" });

export const sandiSchema = z.string().min(8, "Kata sandi minimal 8 karakter").max(128);

export const peranSchema = z.enum(["bos", "kasir", "pengawas", "kolektor"]);
export type Peran = z.infer<typeof peranSchema>;

/** Keterangan HP yang login — tampilan di daftar perangkat. */
export const infoPerangkatSchema = z.object({
  nama: z.string().trim().min(1).max(100).optional(),
  platform: z.enum(["android", "ios", "web"]).optional(),
});

/** `POST /auth/register` — bos membuka kantor baru (berkode). */
export const registrasiSchema = z.object({
  /** Spasi yang ikut tersalin di awal/akhir diabaikan. */
  kodeRegistrasi: z.string().trim().min(1),
  namaKantor: z.string().trim().min(1).max(100),
  zonaWaktu: z.enum(["WIB", "WITA", "WIT"]).default("WIB"),
  nama: z.string().trim().min(1).max(50),
  nomorHp: nomorHpSchema,
  sandi: sandiSchema,
  perangkat: infoPerangkatSchema.optional(),
});
export type RegistrasiInput = z.infer<typeof registrasiSchema>;

/** `POST /auth/login` — bos masuk dengan nomor HP + kata sandi. */
export const loginSchema = z.object({
  nomorHp: nomorHpSchema,
  sandi: z.string().min(1).max(128),
  perangkat: infoPerangkatSchema.optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** `POST /auth/refresh` — tukar token segar dengan pasangan token baru. */
export const refreshSchema = z.object({
  tokenSegar: z.string().min(1),
});

/** Pasangan token sesi. */
export const tokenSchema = z.object({
  /** JWT pendek untuk header `Authorization: Bearer …`. */
  tokenAkses: z.string(),
  /** Token perangkat untuk `POST /auth/refresh`; simpan di brankas aman HP. */
  tokenSegar: z.string(),
  /** Detik sampai token akses kedaluwarsa. */
  aksesBerlakuDetik: z.number().int(),
});

/** Profil pengguna yang sedang masuk. */
export const profilSchema = z.object({
  id: z.uuid(),
  nama: z.string(),
  peran: peranSchema,
  nomorHp: z.string().nullable(),
  kantor: z.object({
    id: z.uuid(),
    nama: z.string(),
    zonaWaktu: z.enum(["WIB", "WITA", "WIT"]),
  }),
});
export type Profil = z.infer<typeof profilSchema>;

/** Jawaban registrasi & login: token + profil. */
export const sesiSchema = tokenSchema.extend({ pengguna: profilSchema });
export type Sesi = z.infer<typeof sesiSchema>;
