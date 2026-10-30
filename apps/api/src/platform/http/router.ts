import { OpenAPIHono } from "@hono/zod-openapi";
import type { Hono } from "hono";
import type { ExtractSchema, Schema } from "hono/types";
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

/**
 * Tipe klien RPC (`hc`) untuk sekumpulan router — satu konteks, bukan seluruh
 * API: skemanya digabung dari router-router itu saja.
 */
// biome-ignore lint/suspicious/noExplicitAny: parameter generik Hono sengaja dilonggarkan
export type RuteKonteks<R extends Hono<any, any, any>> =
  ExtractSchema<R> extends infer S extends Schema ? Hono<Lingkungan, S, "/"> : never;
