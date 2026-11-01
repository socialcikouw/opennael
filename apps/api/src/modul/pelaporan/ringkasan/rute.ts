import { createRoute, z } from "@hono/zod-openapi";
import {
  performaHarianSchema,
  ringkasanKolektorSchema,
  ringkasanSchema,
  saringPerformaSchema,
  saringRingkasanSchema,
} from "@opennael/contracts";
import type { ZodType } from "zod";
import { jawabanGalat, json } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananRingkasan } from "./layanan";

const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh / bukan milik Anda"],
  [422, "Rentang tidak sah / terlalu panjang"],
);

const baca = <P extends string, S extends ZodType, Q extends z.ZodObject>(
  path: P,
  summary: string,
  schema: S,
  query: Q,
) =>
  createRoute({
    method: "get",
    path,
    tags: ["ringkasan"],
    summary,
    security: [{ bearer: [] }],
    request: { query },
    responses: { 200: { description: "Berhasil", ...json(schema) }, ...galat },
  });

const ringkasan = baca(
  "/ringkasan",
  "Angka satu rentang — kantor atau satu kolektor (kolektor: miliknya)",
  ringkasanSchema,
  saringRingkasanSchema,
);
const perKolektor = baca(
  "/ringkasan/per-kolektor",
  "Angka satu rentang per kolektor (bos, pengawas)",
  z.array(ringkasanKolektorSchema),
  saringRingkasanSchema,
);
const performa = baca(
  "/ringkasan/performa",
  "Deret performa penagihan per hari — aturan-usaha N; jenis = harian (bawaan) · mingguan · tempoan · semua",
  z.array(performaHarianSchema),
  saringPerformaSchema,
);

export function ruteRingkasan(layanan: LayananRingkasan, periksa: PeriksaTokenAkses) {
  const router = buatRouter();
  const masuk = wajibMasuk(periksa);
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
