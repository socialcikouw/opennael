import { createRoute, z } from "@hono/zod-openapi";
import {
  batalSchema,
  koreksiInputSchema,
  koreksiSchema,
  penarikanInputSchema,
  penarikanSchema,
} from "@opennael/contracts";
import type { ZodType } from "zod";
import { buatRouter, jawabanGalat } from "../../router";
import type { LayananAuth } from "../auth/layanan";
import { wajibMasuk } from "../auth/wajib-masuk";
import type { LayananTabungan } from "./layanan";

const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });
const aman = [{ bearer: [] }];
const tag = ["tabungan nasabah"];
const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh"],
  [404, "Tidak ditemukan"],
  [409, "Sudah dibatalkan"],
  [422, "Melanggar aturan usaha (tabungan berubah / tidak cukup / tidak wajar)"],
);
const idParam = z.object({ id: z.uuid() });

const catatUntukNasabah = <P extends string, B extends ZodType, S extends ZodType>(
  path: P,
  summary: string,
  body: B,
  schema: S,
) =>
  createRoute({
    method: "post",
    path,
    tags: tag,
    summary,
    security: aman,
    request: { params: idParam, body: { ...json(body), required: true } },
    responses: { 201: { description: "Tercatat", ...json(schema) }, ...galat },
  });

const riwayatNasabah = <P extends string, S extends ZodType>(path: P, summary: string, schema: S) =>
  createRoute({
    method: "get",
    path,
    tags: tag,
    summary,
    security: aman,
    request: { params: idParam },
    responses: { 200: { description: "Riwayat", ...json(z.array(schema)) }, ...galat },
  });

const tarik = catatUntukNasabah(
  "/nasabah/{id}/penarikan-tabungan",
  "Penarikan tabungan dari kas kantor (bos)",
  penarikanInputSchema,
  penarikanSchema,
);
const daftarPenarikan = riwayatNasabah(
  "/nasabah/{id}/penarikan-tabungan",
  "Riwayat penarikan tabungan satu nasabah (bos, pengawas)",
  penarikanSchema,
);
const batalPenarikan = createRoute({
  method: "post",
  path: "/penarikan-tabungan/{id}/batal",
  tags: tag,
  summary: "Batal penarikan (bos, hari yang sama) — tabungan kembali",
  security: aman,
  request: { params: idParam, body: { ...json(batalSchema), required: true } },
  responses: { 200: { description: "Dibatalkan", ...json(penarikanSchema) }, ...galat },
});
const koreksi = catatUntukNasabah(
  "/nasabah/{id}/koreksi-tabungan",
  "Koreksi angka tabungan tanpa uang (bos)",
  koreksiInputSchema,
  koreksiSchema,
);
const daftarKoreksi = riwayatNasabah(
  "/nasabah/{id}/koreksi-tabungan",
  "Riwayat koreksi tabungan satu nasabah (bos, pengawas)",
  koreksiSchema,
);

export function ruteTabungan(tabungan: (kunci?: string) => LayananTabungan, auth: LayananAuth) {
  const router = buatRouter();
  router.use("/nasabah/*", wajibMasuk(auth));
  router.use("/penarikan-tabungan/*", wajibMasuk(auth));
  return router
    .openapi(tarik, async (c) =>
      c.json(
        await tabungan(c.req.header("Idempotency-Key")).tarik(
          c.get("aktor"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        201,
      ),
    )
    .openapi(daftarPenarikan, async (c) =>
      c.json(
        await tabungan(c.req.header("Idempotency-Key")).daftarPenarikan(
          c.get("aktor"),
          c.req.valid("param").id,
        ),
        200,
      ),
    )
    .openapi(batalPenarikan, async (c) =>
      c.json(
        await tabungan(c.req.header("Idempotency-Key")).batalPenarikan(
          c.get("aktor"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(koreksi, async (c) =>
      c.json(
        await tabungan(c.req.header("Idempotency-Key")).koreksi(
          c.get("aktor"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        201,
      ),
    )
    .openapi(daftarKoreksi, async (c) =>
      c.json(
        await tabungan(c.req.header("Idempotency-Key")).daftarKoreksi(
          c.get("aktor"),
          c.req.valid("param").id,
        ),
        200,
      ),
    );
}
