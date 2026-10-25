import { OpenAPIHono } from "@hono/zod-openapi";
import { galatSchema } from "@opennael/contracts";
import { jawabanValidasi } from "./galat";
import type { Aktor } from "./modul/auth/token";

/** Variabel per permintaan; `aktor` diisi middleware `wajibMasuk`. */
export type Lingkungan = { Variables: { aktor: Aktor } };

/** Router modul — galat validasi dijawab dengan bentuk `galatSchema` yang sama. */
export function buatRouter() {
  return new OpenAPIHono<Lingkungan>({
    defaultHook: (hasil, c) => {
      if (!hasil.success) return c.json(jawabanValidasi(hasil.error), 400);
    },
  });
}

/** Jawaban galat untuk definisi rute OpenAPI. */
export function jawabanGalat(...daftar: [number, string][]) {
  return Object.fromEntries(
    daftar.map(([status, description]) => [
      status,
      { description, content: { "application/json": { schema: galatSchema } } },
    ]),
  );
}
