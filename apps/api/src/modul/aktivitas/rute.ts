import { createRoute, z } from "@hono/zod-openapi";
import {
  aktivitasSchema,
  jejakRiwayatSchema,
  saringAktivitasSchema,
  saringRiwayatSchema,
} from "@opennael/contracts";
import { jawabanGalat, json } from "../../platform/http/openapi";
import { buatRouter } from "../../platform/http/router";
import { wajibMasuk } from "../../platform/http/wajib-masuk";
import type { LayananAuth } from "../auth/layanan";
import type { LayananAktivitas } from "./layanan";

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
  const masuk = wajibMasuk(auth.periksaTokenAkses);
  router.use("/aktivitas", masuk);
  router.use("/riwayat", masuk);
  return router
    .openapi(aktivitas, async (c) =>
      c.json(await layanan.aktivitas(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(riwayat, async (c) =>
      c.json(await layanan.riwayat(c.get("aktor"), c.req.valid("query")), 200),
    );
}
