import { createRoute, z } from "@hono/zod-openapi";
import {
  batalSchema,
  hasilBukaBlokirSchema,
  hasilPemutihanSchema,
  putihkanSchema,
} from "@opennael/contracts";
import type { ZodType } from "zod";
import { jawabanGalat, json } from "../../platform/http/openapi";
import { buatRouter } from "../../platform/http/router";
import { wajibMasuk } from "../../platform/http/wajib-masuk";
import type { LayananAuth } from "../auth/layanan";
import type { LayananPemutihan } from "./layanan";

const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh"],
  [404, "Tidak ditemukan"],
  [409, "Sudah diputihkan / pinjaman lain masih aktif"],
  [422, "Bukan pinjaman aktif / tidak sedang diputihkan / tidak diblokir"],
);

const tulis = <P extends string, B extends ZodType, S extends ZodType>(
  path: P,
  summary: string,
  body: B,
  schema: S,
) =>
  createRoute({
    method: "post",
    path,
    tags: ["pemutihan"],
    summary,
    security: [{ bearer: [] }],
    request: {
      params: z.object({ id: z.uuid() }),
      body: { ...json(body), required: true },
    },
    responses: { 200: { description: "Berhasil", ...json(schema) }, ...galat },
  });

const putihkan = tulis(
  "/pinjaman/{id}/putihkan",
  "Putihkan pinjaman aktif — nasabah diblokir (bos)",
  putihkanSchema,
  hasilPemutihanSchema,
);
const batalPutihkan = tulis(
  "/pinjaman/{id}/putihkan/batal",
  "Batal pemutihan — status kembali, blokir dibuka bila pemutihan terakhir (bos)",
  batalSchema,
  hasilPemutihanSchema,
);
const bukaBlokir = tulis(
  "/nasabah/{id}/buka-blokir",
  "Buka blokir nasabah (bos)",
  batalSchema,
  hasilBukaBlokirSchema,
);

export function rutePemutihan(layanan: LayananPemutihan, auth: LayananAuth) {
  const router = buatRouter();
  const masuk = wajibMasuk(auth.periksaTokenAkses);
  router.use("/pinjaman/*", masuk);
  router.use("/nasabah/*", masuk);
  return router
    .openapi(putihkan, async (c) =>
      c.json(
        await layanan.putihkan(c.get("aktor"), c.req.valid("param").id, c.req.valid("json")),
        200,
      ),
    )
    .openapi(batalPutihkan, async (c) =>
      c.json(
        await layanan.batalPutihkan(c.get("aktor"), c.req.valid("param").id, c.req.valid("json")),
        200,
      ),
    )
    .openapi(bukaBlokir, async (c) =>
      c.json(
        await layanan.bukaBlokir(c.get("aktor"), c.req.valid("param").id, c.req.valid("json")),
        200,
      ),
    );
}
