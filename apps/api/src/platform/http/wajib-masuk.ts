import { createMiddleware } from "hono/factory";
import type { Aktor } from "./aktor";
import { tidakSah } from "./galat";
import type { Lingkungan } from "./router";

/** Pemeriksa token akses — disuntik saat perakitan (dari konteks identitas). */
export type PeriksaTokenAkses = (token: string) => Promise<Aktor>;

/**
 * Rute yang butuh pengguna masuk: token akses di `Authorization: Bearer …`.
 * Token akses berumur pendek (15 menit) — pencabutan perangkat berlaku paling
 * lambat sekian, karena token segarnya sudah ditolak.
 */
export function wajibMasuk(periksa: PeriksaTokenAkses) {
  return createMiddleware<Lingkungan>(async (c, next) => {
    // Sudah diperiksa router lain pada jalur bertingkat (mis. /kas/* lalu /kas/gaji).
    if (c.get("aktor")) return next();
    const kepala = c.req.header("Authorization") ?? "";
    const [jenis, token] = kepala.split(" ");
    if (jenis !== "Bearer" || !token) {
      throw tidakSah("BELUM_MASUK", "Silakan masuk terlebih dahulu");
    }
    try {
      c.set("aktor", await periksa(token));
    } catch {
      throw tidakSah("TOKEN_AKSES_TIDAK_SAH", "Token akses tidak berlaku");
    }
    await next();
  });
}
