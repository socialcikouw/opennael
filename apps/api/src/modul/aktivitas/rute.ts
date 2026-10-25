import { createRoute, z } from "@hono/zod-openapi";
import {
  aktivitasSchema,
  jejakRiwayatSchema,
  saringAktivitasSchema,
  saringRiwayatSchema,
} from "@opennael/contracts";
import { buatRouter, jawabanGalat } from "../../router";
import type { LayananAuth } from "../auth/layanan";
import { wajibMasuk } from "../auth/wajib-masuk";
import type { LayananAktivitas } from "./layanan";

const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });
const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh"],
);

const aktivitas = createRoute({
  method: "get",
  path: "/aktivitas",
  tags: ["aktivitas"],
  summary: "Siapa melakukan apa pada satu tanggal kantor — terbaru dulu (bos, pengawas)",
  security: [{ bearer: [] }],
  request: { query: saringAktivitasSchema },
  responses: { 200: { description: "Berhasil", ...json(z.array(aktivitasSchema)) }, ...galat },
});

const riwayat = createRoute({
  method: "get",
  path: "/riwayat",
  tags: ["aktivitas"],
  summary: "Jejak perubahan satu baris — terbaru dulu (bos, pengawas)",
  security: [{ bearer: [] }],
  request: { query: saringRiwayatSchema },
  responses: { 200: { description: "Berhasil", ...json(z.array(jejakRiwayatSchema)) }, ...galat },
});

export function ruteAktivitas(layanan: LayananAktivitas, auth: LayananAuth) {
  const router = buatRouter();
  router.use("/aktivitas", wajibMasuk(auth));
  router.use("/riwayat", wajibMasuk(auth));
  return router
    .openapi(aktivitas, async (c) =>
      c.json(await layanan.aktivitas(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(riwayat, async (c) =>
      c.json(await layanan.riwayat(c.get("aktor"), c.req.valid("query")), 200),
    );
}
