import { createRoute } from "@hono/zod-openapi";
import { ruteSchema, saringRuteSchema, simpanRuteSchema } from "@opennael/contracts";
import { jawabanGalat, json } from "../../platform/http/openapi";
import { buatRouter } from "../../platform/http/router";
import { wajibMasuk } from "../../platform/http/wajib-masuk";
import type { LayananAuth } from "../auth/layanan";
import type { LayananRute } from "./layanan";

const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh / bukan milik Anda"],
  [404, "Tidak ditemukan"],
  [409, "Rute baru saja diubah orang lain (versi basi)"],
  [422, "Kolektor wajib disebut"],
);

const baca = createRoute({
  method: "get",
  path: "/rute-kolektor",
  tags: ["rute kolektor"],
  summary: "Rute kolektor — kolektor: miliknya; bos & pengawas: sebut kolektornya",
  security: [{ bearer: [] }],
  request: { query: saringRuteSchema },
  responses: { 200: { description: "Rute", ...json(ruteSchema) }, ...galat },
});
const simpan = createRoute({
  method: "put",
  path: "/rute-kolektor",
  tags: ["rute kolektor"],
  summary: "Simpan rute utuh dengan versi terakhir dibaca (kolektor: miliknya; bos)",
  security: [{ bearer: [] }],
  request: { body: { ...json(simpanRuteSchema), required: true } },
  responses: { 200: { description: "Tersimpan", ...json(ruteSchema) }, ...galat },
});

export function ruteRuteKolektor(layanan: LayananRute, auth: LayananAuth) {
  const router = buatRouter();
  router.use("/rute-kolektor", wajibMasuk(auth.periksaTokenAkses));
  return router
    .openapi(baca, async (c) =>
      c.json(await layanan.baca(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(simpan, async (c) =>
      c.json(await layanan.simpan(c.get("aktor"), c.req.valid("json")), 200),
    );
}
