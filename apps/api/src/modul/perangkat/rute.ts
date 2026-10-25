import { createRoute, z } from "@hono/zod-openapi";
import { perangkatSchema, saringPerangkatSchema } from "@opennael/contracts";
import { buatRouter, jawabanGalat } from "../../router";
import type { LayananAuth } from "../auth/layanan";
import { wajibMasuk } from "../auth/wajib-masuk";
import type { LayananPerangkat } from "./layanan";

const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });
const aman = [{ bearer: [] }];
const tag = ["auth"];
const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Bukan milik Anda / riwayat hanya bos"],
  [404, "Tidak ditemukan"],
  [409, "Sudah diputus"],
);

const daftar = createRoute({
  method: "get",
  path: "/auth/perangkat",
  tags: tag,
  summary: "Perangkat yang masuk — bos: seluruh kantor; peran lain: miliknya",
  security: aman,
  request: { query: saringPerangkatSchema },
  responses: { 200: { description: "Perangkat", ...json(z.array(perangkatSchema)) }, ...galat },
});
const putus = createRoute({
  method: "delete",
  path: "/auth/perangkat/{id}",
  tags: tag,
  summary: "Putus satu perangkat — milik sendiri, atau (bos) perangkat mana pun di kantornya",
  security: aman,
  request: { params: z.object({ id: z.uuid() }) },
  responses: {
    200: {
      description: "Diputus",
      ...json(z.object({ id: z.uuid(), alasan: z.enum(["keluar", "diputus"]) })),
    },
    ...galat,
  },
});

export function rutePerangkat(layanan: LayananPerangkat, auth: LayananAuth) {
  const router = buatRouter();
  router.use("/auth/perangkat", wajibMasuk(auth));
  router.use("/auth/perangkat/*", wajibMasuk(auth));
  return router
    .openapi(daftar, async (c) =>
      c.json(await layanan.daftar(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(putus, async (c) =>
      c.json(await layanan.putus(c.get("aktor"), c.req.valid("param").id), 200),
    );
}
