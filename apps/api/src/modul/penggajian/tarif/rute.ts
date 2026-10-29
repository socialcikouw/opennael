import { createRoute, z } from "@hono/zod-openapi";
import {
  saringTarifBerlakuSchema,
  tarifBerlakuSchema,
  tarifInputSchema,
  tarifSchema,
} from "@opennael/contracts";
import { aman, jawabanGalat, pembuatRute } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananTarif } from "./layanan";

const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh"],
  [404, "Tidak ditemukan"],
  [422, "Melanggar aturan (mundur, jam, rentang, hari sudah berjalan, tarif kantor)"],
);
const { berhasil, baca, tulis } = pembuatRute(["pengaturan"], galat);

const tag = ["pengaturan"];
const daftarTarif = baca("/tarif-gaji", "Riwayat tarif gaji (bos, pengawas)", z.array(tarifSchema));
const tarifBerlaku = createRoute({
  method: "get",
  path: "/tarif-gaji/berlaku",
  tags: tag,
  summary: "Tarif gaji hari ini + sumbernya — kolektor: miliknya",
  security: aman,
  request: { query: saringTarifBerlakuSchema },
  responses: berhasil(tarifBerlakuSchema),
});
const aturTarif = tulis(
  "put",
  "/tarif-gaji",
  "Atur tarif gaji kantor / khusus kolektor — tidak boleh mundur (bos)",
  tarifInputSchema,
  tarifSchema,
);

export function ruteTarif(layanan: LayananTarif, periksa: PeriksaTokenAkses) {
  const router = buatRouter();
  const masuk = wajibMasuk(periksa);
  router.use("/tarif-gaji", masuk);
  router.use("/tarif-gaji/*", masuk);
  return router
    .openapi(daftarTarif, async (c) => c.json(await layanan.daftarTarif(c.get("aktor")), 200))
    .openapi(tarifBerlaku, async (c) =>
      c.json(await layanan.tarifBerlaku(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(aturTarif, async (c) =>
      c.json(await layanan.aturTarif(c.get("aktor"), c.req.valid("json")), 200),
    );
}
