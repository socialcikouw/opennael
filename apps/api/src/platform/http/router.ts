import { OpenAPIHono } from "@hono/zod-openapi";
import type { Aktor } from "./aktor";
import { jawabanValidasi } from "./galat";

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
