import type { Galat } from "@opennael/contracts";
import { bakukanNomorHp } from "@opennael/domain";
import type { Context, MiddlewareHandler } from "hono";
import { rateLimiter } from "hono-rate-limiter";

/**
 * PEMBATAS PERCOBAAN — disimpan di memori proses (satu proses di satu VPS,
 * tanpa Redis). Dua lapis untuk jalur masuk:
 *   - per alamat IP: semua permintaan login/registrasi/refresh;
 *   - per nomor HP: hanya percobaan login yang GAGAL — menahan penebak sandi
 *     satu akun walau ia berganti-ganti IP, tanpa mengunci bos yang sudah
 *     berhasil masuk.
 */
export interface BatasPercobaan {
  /** Panjang jendela hitung (ms). */
  jendelaMs: number;
  /** Permintaan per IP per jendela (login, registrasi, refresh). */
  perIp: number;
  /** Login gagal per nomor HP per jendela. */
  gagalPerNomor: number;
}

export const BATAS_BAWAAN: BatasPercobaan = {
  jendelaMs: 15 * 60 * 1000,
  perIp: 30,
  gagalPerNomor: 5,
};

/**
 * Alamat klien. Di belakang Nginx (`percayaProxy`) dibaca dari `X-Real-IP` /
 * `X-Forwarded-For` yang dipasang Nginx; tanpa proxy header itu bisa dipalsu,
 * jadi dibaca dari soket (`Bun.serve` mengoper server sebagai `c.env`).
 */
export function alamatKlien(c: Context, percayaProxy: boolean): string {
  if (percayaProxy) {
    const dariProxy =
      c.req.header("X-Real-IP") ?? c.req.header("X-Forwarded-For")?.split(",")[0]?.trim();
    if (dariProxy) return dariProxy;
  }
  const server = c.env as { requestIP?: (r: Request) => { address: string } | null } | undefined;
  return server?.requestIP?.(c.req.raw)?.address ?? "tidak-diketahui";
}

const terlaluBanyak = (c: Context) =>
  c.json<Galat>(
    {
      kode: "TERLALU_BANYAK_PERCOBAAN",
      pesan: "Terlalu banyak percobaan — tunggu beberapa menit lalu coba lagi",
    },
    429,
  );

export function pembatasPerIp(batas: BatasPercobaan, percayaProxy: boolean): MiddlewareHandler {
  return rateLimiter({
    windowMs: batas.jendelaMs,
    limit: batas.perIp,
    standardHeaders: "draft-7",
    keyGenerator: (c) => `ip:${alamatKlien(c, percayaProxy)}`,
    handler: terlaluBanyak,
  });
}

export function pembatasLoginPerNomor(batas: BatasPercobaan): MiddlewareHandler {
  return rateLimiter({
    windowMs: batas.jendelaMs,
    limit: batas.gagalPerNomor,
    standardHeaders: "draft-7",
    skipSuccessfulRequests: true,
    keyGenerator: async (c) => {
      // Body dibaca sekali dan disimpan Hono; validator rute memakai salinan yang sama.
      const isi = (await c.req.json().catch(() => null)) as { nomorHp?: unknown } | null;
      const nomor = typeof isi?.nomorHp === "string" ? bakukanNomorHp(isi.nomorHp) : null;
      return `nomor:${nomor ?? "tidak-sah"}`;
    },
    handler: terlaluBanyak,
  });
}
