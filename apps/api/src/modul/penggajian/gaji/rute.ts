import { createRoute, z } from "@hono/zod-openapi";
import {
  batalSchema,
  bayarGajiSchema,
  idParamSchema,
  pratinjauGajiSchema,
  saringPratinjauGajiSchema,
  saringSlipGajiSchema,
  slipGajiSchema,
} from "@opennael/contracts";
import { aman, jawabanGalat, json } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananGaji } from "./layanan";

const tag = ["gaji kolektor"];
const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh / bukan milik Anda"],
  [404, "Tidak ditemukan"],
  [409, "Periode sudah dibayar / sudah dibatalkan"],
  [422, "Melanggar aturan usaha (periode belum berakhir, tekor melebihi gaji, buku kas)"],
);

const pratinjau = createRoute({
  method: "get",
  path: "/kas/gaji/pratinjau",
  tags: tag,
  summary: "Pratinjau gaji satu kolektor satu periode (bos)",
  security: aman,
  request: { query: saringPratinjauGajiSchema },
  responses: { 200: { description: "Pratinjau", ...json(pratinjauGajiSchema) }, ...galat },
});
const bayar = createRoute({
  method: "post",
  path: "/kas/gaji",
  tags: tag,
  summary: "Bayar gaji — angka dihitung & dibekukan server (bos)",
  security: aman,
  request: { body: { ...json(bayarGajiSchema), required: true } },
  responses: { 201: { description: "Dibayar", ...json(slipGajiSchema) }, ...galat },
});
const batal = createRoute({
  method: "post",
  path: "/kas/gaji/{id}/batal",
  tags: tag,
  summary: "Batal pembayaran gaji (bos, hari yang sama)",
  security: aman,
  request: {
    params: idParamSchema,
    body: { ...json(batalSchema), required: true },
  },
  responses: { 200: { description: "Dibatalkan", ...json(slipGajiSchema) }, ...galat },
});
const daftar = createRoute({
  method: "get",
  path: "/kas/gaji",
  tags: tag,
  summary: "Riwayat slip gaji — kolektor: miliknya",
  security: aman,
  request: { query: saringSlipGajiSchema },
  responses: { 200: { description: "Slip", ...json(z.array(slipGajiSchema)) }, ...galat },
});

export function ruteGaji(gaji: (kunci?: string) => LayananGaji, periksa: PeriksaTokenAkses) {
  const router = buatRouter();
  const masuk = wajibMasuk(periksa);
  router.use("/kas/gaji", masuk);
  router.use("/kas/gaji/*", masuk);
  return router
    .openapi(pratinjau, async (c) =>
      c.json(
        await gaji(c.req.header("Idempotency-Key")).pratinjau(c.get("aktor"), c.req.valid("query")),
        200,
      ),
    )
    .openapi(bayar, async (c) =>
      c.json(
        await gaji(c.req.header("Idempotency-Key")).bayar(c.get("aktor"), c.req.valid("json")),
        201,
      ),
    )
    .openapi(batal, async (c) =>
      c.json(
        await gaji(c.req.header("Idempotency-Key")).batal(
          c.get("aktor"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(daftar, async (c) =>
      c.json(
        await gaji(c.req.header("Idempotency-Key")).daftar(c.get("aktor"), c.req.valid("query")),
        200,
      ),
    );
}
