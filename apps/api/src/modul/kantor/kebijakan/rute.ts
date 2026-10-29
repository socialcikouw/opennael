import { createRoute, z } from "@hono/zod-openapi";
import {
  remAktifSchema,
  remBerlakuSchema,
  remInputSchema,
  remNasabahInputSchema,
} from "@opennael/contracts";
import { aman, jawabanGalat, json, pembuatRute } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananKebijakan } from "./layanan";

const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh"],
  [404, "Tidak ditemukan"],
  [422, "Melanggar aturan (mundur, jam, rentang, hari sudah berjalan, tarif kantor)"],
);
const { berhasil, baca, tulis } = pembuatRute(["pengaturan"], galat);

const tag = ["pengaturan"];
const remBerlaku = baca("/kebijakan", "Rem yang berlaku bagi pembaca", remBerlakuSchema);
const remAktif = baca(
  "/kebijakan/aktif",
  "Semua rem yang menyala (bos, pengawas)",
  z.array(remAktifSchema),
);
const remKantor = tulis(
  "put",
  "/kebijakan/kantor",
  "Rem lapis kantor (bos)",
  remInputSchema,
  remBerlakuSchema,
);
const remKolektor = createRoute({
  method: "put",
  path: "/kebijakan/kolektor/{kolektorId}",
  tags: tag,
  summary: "Rem lapis kolektor (bos)",
  security: aman,
  request: {
    params: z.object({ kolektorId: z.uuid() }),
    body: { ...json(remInputSchema), required: true },
  },
  responses: berhasil(remBerlakuSchema),
});
const remNasabah = createRoute({
  method: "put",
  path: "/kebijakan/nasabah/{nasabahId}",
  tags: tag,
  summary: "Rem lapis nasabah — tanpa saklar pinjaman baru (bos)",
  security: aman,
  request: {
    params: z.object({ nasabahId: z.uuid() }),
    body: { ...json(remNasabahInputSchema), required: true },
  },
  responses: berhasil(remBerlakuSchema),
});

export function ruteKebijakan(layanan: LayananKebijakan, periksa: PeriksaTokenAkses) {
  const router = buatRouter();
  const masuk = wajibMasuk(periksa);
  router.use("/kebijakan", masuk);
  router.use("/kebijakan/*", masuk);
  return router
    .openapi(remBerlaku, async (c) => c.json(await layanan.kebijakanBerlaku(c.get("aktor")), 200))
    .openapi(remAktif, async (c) => c.json(await layanan.remAktif(c.get("aktor")), 200))
    .openapi(remKantor, async (c) =>
      c.json(await layanan.remKantor(c.get("aktor"), c.req.valid("json")), 200),
    )
    .openapi(remKolektor, async (c) =>
      c.json(
        await layanan.remKolektor(
          c.get("aktor"),
          c.req.valid("param").kolektorId,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(remNasabah, async (c) =>
      c.json(
        await layanan.remNasabah(
          c.get("aktor"),
          c.req.valid("param").nasabahId,
          c.req.valid("json"),
        ),
        200,
      ),
    );
}
