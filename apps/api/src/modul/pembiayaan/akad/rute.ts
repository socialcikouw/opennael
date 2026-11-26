import { createRoute } from "@hono/zod-openapi";
import {
  akadSchema,
  gulungSchema,
  hasilGulungSchema,
  hasilPeriksaAkadSchema,
  periksaAkadSchema,
  pinjamanSchema,
} from "@opennael/contracts";
import { aman, galatLapangan, json, tulisLapangan } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananAkad } from "./layanan";

const akad = tulisLapangan(
  "/lapangan/akad",
  "Akad pinjaman baru (orang baru / pinjam lagi)",
  akadSchema,
  pinjamanSchema,
);
/** Pemeriksaan sebelum foto serah terima: tak menulis apa pun → 200, bukan 201. */
const periksaAkad = createRoute({
  method: "post",
  path: "/lapangan/akad/periksa",
  tags: ["lapangan"],
  summary: "Periksa akad sebelum foto serah terima (tanpa menulis)",
  security: aman,
  request: { body: { ...json(periksaAkadSchema), required: true } },
  responses: {
    200: { description: "Akad boleh dilanjutkan", ...json(hasilPeriksaAkadSchema) },
    ...galatLapangan,
  },
});
const gulung = tulisLapangan(
  "/lapangan/gulung",
  "Gulung — pinjaman lama dilunasi pinjaman baru",
  gulungSchema,
  hasilGulungSchema,
);

export function ruteAkad(layanan: (kunci?: string) => LayananAkad, periksa: PeriksaTokenAkses) {
  const router = buatRouter();
  router.use("/lapangan/*", wajibMasuk(periksa));
  return router
    .openapi(akad, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).akad(c.get("aktor"), c.req.valid("json")),
        201,
      ),
    )
    .openapi(periksaAkad, async (c) =>
      c.json(await layanan().periksaAkad(c.get("aktor"), c.req.valid("json")), 200),
    )
    .openapi(gulung, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).gulung(c.get("aktor"), c.req.valid("json")),
        201,
      ),
    );
}
