import { createRoute, z } from "@hono/zod-openapi";
import {
  gantiNamaWilayahSchema,
  hasilGantiNamaWilayahSchema,
  saringWilayahSchema,
  wilayahDihapusSchema,
  wilayahSchema,
} from "@opennael/contracts";
import { aman, jawabanGalat, json } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananWilayah } from "./layanan";

const tag = ["kampung"];
const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh"],
  [404, "Tidak ditemukan"],
  [409, "Kampung masih dipakai"],
  [422, "Tak ada perubahan"],
);

const daftar = createRoute({
  method: "get",
  path: "/wilayah",
  tags: tag,
  summary: "Kampung kantor dengan pemakaiannya (semua peran)",
  security: aman,
  request: { query: saringWilayahSchema },
  responses: { 200: { description: "Kampung", ...json(z.array(wilayahSchema)) }, ...galat },
});
const gantiNama = createRoute({
  method: "post",
  path: "/wilayah/ganti-nama",
  tags: tag,
  summary: "Ganti nama kampung — gabung bila nama baru sudah dipakai (bos)",
  security: aman,
  request: { body: { ...json(gantiNamaWilayahSchema), required: true } },
  responses: {
    200: { description: "Tersimpan", ...json(hasilGantiNamaWilayahSchema) },
    ...galat,
  },
});
const hapus = createRoute({
  method: "delete",
  path: "/wilayah/{id}",
  tags: tag,
  summary: "Hapus kampung kosong (bos)",
  security: aman,
  request: { params: z.object({ id: z.uuid() }) },
  responses: { 200: { description: "Dihapus", ...json(wilayahDihapusSchema) }, ...galat },
});

export function ruteWilayah(layanan: LayananWilayah, periksa: PeriksaTokenAkses) {
  const router = buatRouter();
  const masuk = wajibMasuk(periksa);
  router.use("/wilayah", masuk);
  router.use("/wilayah/*", masuk);
  return router
    .openapi(daftar, async (c) =>
      c.json(await layanan.daftar(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(gantiNama, async (c) =>
      c.json(await layanan.gantiNama(c.get("aktor"), c.req.valid("json")), 200),
    )
    .openapi(hapus, async (c) =>
      c.json(await layanan.hapus(c.get("aktor"), c.req.valid("param").id), 200),
    );
}
