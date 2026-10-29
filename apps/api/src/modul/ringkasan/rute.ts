import { createRoute, z } from "@hono/zod-openapi";
import {
  performaHarianSchema,
  ringkasanKolektorSchema,
  ringkasanSchema,
  saringRingkasanSchema,
} from "@opennael/contracts";
import type { ZodType } from "zod";
import { jawabanGalat, json } from "../../platform/http/openapi";
import { buatRouter } from "../../platform/http/router";
import { wajibMasuk } from "../../platform/http/wajib-masuk";
import type { LayananAuth } from "../auth/layanan";
import type { LayananRingkasan } from "./layanan";

const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh / bukan milik Anda"],
  [422, "Rentang tidak sah / terlalu panjang"],
);

const baca = <P extends string, S extends ZodType>(path: P, summary: string, schema: S) =>
  createRoute({
    method: "get",
    path,
    tags: ["ringkasan"],
    summary,
    security: [{ bearer: [] }],
    request: { query: saringRingkasanSchema },
    responses: { 200: { description: "Berhasil", ...json(schema) }, ...galat },
  });

const ringkasan = baca(
  "/ringkasan",
  "Angka satu rentang — kantor atau satu kolektor (kolektor: miliknya)",
  ringkasanSchema,
);
const perKolektor = baca(
  "/ringkasan/per-kolektor",
  "Angka satu rentang per kolektor (bos, pengawas)",
  z.array(ringkasanKolektorSchema),
);
const performa = baca(
  "/ringkasan/performa",
  "Deret performa penagihan harian — aturan-usaha N",
  z.array(performaHarianSchema),
);

export function ruteRingkasan(layanan: LayananRingkasan, auth: LayananAuth) {
  const router = buatRouter();
  const masuk = wajibMasuk(auth.periksaTokenAkses);
  router.use("/ringkasan", masuk);
  router.use("/ringkasan/*", masuk);
  return router
    .openapi(ringkasan, async (c) =>
      c.json(await layanan.ringkasan(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(perKolektor, async (c) =>
      c.json(await layanan.perKolektor(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(performa, async (c) =>
      c.json(await layanan.performa(c.get("aktor"), c.req.valid("query")), 200),
    );
}
