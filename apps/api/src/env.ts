import { z } from "zod";
import { TINGKAT_LOG } from "./platform/log";

const rahasia = (nama: string) =>
  z.string().min(32, `${nama} minimal 32 karakter acak (mis. \`openssl rand -base64 48\`)`);

/**
 * Variabel lingkungan, diperiksa sekali saat server menyala — `.env` yang
 * kurang atau salah membuat server menolak menyala, bukan gagal di tengah
 * jalan. Bun memuat `.env` sendiri.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** Postgres: Supabase saat pengembangan, Postgres VPS di produksi. */
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** Kunci tanda tangan token akses (JWT HS256). */
  JWT_RAHASIA: rahasia("JWT_RAHASIA"),
  /** Kunci HMAC token segar per perangkat — beda dengan JWT_RAHASIA. */
  SESI_RAHASIA: rahasia("SESI_RAHASIA"),
  /** `true` bila server di belakang Nginx — alamat klien dari `X-Real-IP`. */
  PERCAYA_PROXY: z.stringbool().default(false),
  /**
   * Kode untuk membuka kantor baru (`POST /auth/register`). Kosong =
   * registrasi ditutup: tanpa ini siapa pun yang tahu alamat API bisa membuat
   * "kantor" sendiri di server ini.
   */
  KODE_REGISTRASI: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(16).optional()),
  /** Tingkat log pino; `silent` mematikan log. */
  LOG_LEVEL: z.enum(TINGKAT_LOG).default("info"),
  /**
   * Gerbang kalender lapangan (aturan-usaha C4). Bawaan `true`; `false` hanya
   * di laptop pengembangan — lihat `bacaEnv`.
   */
  VALIDASI_JAM_KERJA: z.stringbool().default(true),
  VALIDASI_HARI_KERJA: z.stringbool().default(true),
  VALIDASI_LIBUR_KANTOR: z.stringbool().default(true),
});

export type Env = z.infer<typeof envSchema>;

const SAKLAR_KALENDER = [
  "VALIDASI_JAM_KERJA",
  "VALIDASI_HARI_KERJA",
  "VALIDASI_LIBUR_KANTOR",
] as const;

export function bacaEnv(sumber: Record<string, string | undefined> = process.env): Env {
  const hasil = envSchema.safeParse(sumber);
  if (!hasil.success) {
    throw new Error(`Variabel lingkungan tidak sah:\n${z.prettifyError(hasil.error)}`);
  }
  const env = hasil.data;
  // Gerbang yang dimatikan hanya untuk Supabase pengembangan: salah salin
  // `.env` laptop ke VPS membuat server menolak menyala, bukan membuka gerbang.
  const mati = SAKLAR_KALENDER.filter((k) => !env[k]);
  const host = new URL(env.DATABASE_URL).hostname;
  if (mati.length > 0 && !host.endsWith(".supabase.com")) {
    throw new Error(
      `${mati.join(", ")}=false hanya boleh ke Supabase pengembangan — DATABASE_URL menunjuk ${host}`,
    );
  }
  return env;
}
