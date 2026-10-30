import type { MiddlewareHandler } from "hono";
import type { Log } from "../log";

/** Pemeriksaan hidup yang dipanggil berkala — dicatat di tingkat `debug` saja. */
const JALUR_SEPI = new Set(["/sehat"]);

/**
 * Satu baris log per permintaan: metode, jalur, status, lama (ms), dan
 * `requestId` (dari `hono/request-id`, juga dikirim ke klien lewat header
 * `X-Request-Id` supaya laporan "tidak bisa" dari lapangan bisa dicari).
 * Sengaja TIDAK dicatat: header (token), isi permintaan, query string, alamat
 * klien. 5xx = `error`, 4xx = `warn`, selebihnya `info`.
 */
export function middlewareLog(log: Log): MiddlewareHandler {
  return async (c, next) => {
    const mulai = performance.now();
    await next();
    const status = c.res.status;
    const jalur = c.req.path;
    const tingkat = JALUR_SEPI.has(jalur)
      ? "debug"
      : status >= 500
        ? "error"
        : status >= 400
          ? "warn"
          : "info";
    log[tingkat](
      {
        requestId: c.get("requestId"),
        metode: c.req.method,
        jalur,
        status,
        ms: Math.round(performance.now() - mulai),
      },
      "permintaan",
    );
  };
}
