import { createRoute, z } from "@hono/zod-openapi";
import {
  lokasiRumahSchema,
  nasabahLamaSchema,
  nasabahSchema,
  nasabahSerupaSchema,
  neracaNasabahSchema,
  pindahPemegangSchema,
  saringNasabahSchema,
  saringNasabahSerupaSchema,
  ubahNasabahSchema,
} from "@opennael/contracts";
import { aman, galatLapangan, jawabanGalat, json } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananNasabah } from "./layanan";

const tag = ["nasabah"];
const idParam = z.object({ id: z.uuid() });
const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh / bukan pegangan Anda"],
  [404, "Tidak ditemukan"],
  [409, "NIK sudah terdaftar"],
  [422, "Melanggar aturan (kolektor nonaktif, tak ada perubahan)"],
);
const berhasil = { 200: { description: "Berhasil", ...json(nasabahSchema) }, ...galat };

const daftar = createRoute({
  method: "get",
  path: "/nasabah",
  tags: tag,
  summary: "Daftar & cari nasabah — kolektor: pegangannya; kasir: nama & kampung",
  security: aman,
  request: { query: saringNasabahSchema },
  responses: { 200: { description: "Daftar", ...json(z.array(nasabahSchema)) }, ...galat },
});
const serupa = createRoute({
  method: "get",
  path: "/nasabah/serupa",
  tags: tag,
  summary: "Mungkin nasabah lama? — NIK sama / nama mirip, sebelum akad (bos, kolektor)",
  security: aman,
  request: { query: saringNasabahSerupaSchema },
  responses: { 200: { description: "Kandidat", ...json(z.array(nasabahSerupaSchema)) }, ...galat },
});
const neraca = createRoute({
  method: "get",
  path: "/nasabah/{id}/neraca",
  tags: tag,
  summary: "Neraca nasabah — bahan menimbang pemutihan (bos, pengawas)",
  security: aman,
  request: { params: idParam },
  responses: { 200: { description: "Neraca", ...json(neracaNasabahSchema) }, ...galat },
});
const ubah = createRoute({
  method: "patch",
  path: "/nasabah/{id}",
  tags: tag,
  summary: "Sunting identitas nasabah (bos)",
  security: aman,
  request: { params: idParam, body: { ...json(ubahNasabahSchema), required: true } },
  responses: berhasil,
});
const pindah = createRoute({
  method: "post",
  path: "/nasabah/{id}/pindah",
  tags: tag,
  summary: "Pindah pemegang (bos)",
  security: aman,
  request: { params: idParam, body: { ...json(pindahPemegangSchema), required: true } },
  responses: berhasil,
});
const lokasi = createRoute({
  method: "put",
  path: "/nasabah/{id}/lokasi",
  tags: tag,
  summary: "Rekam titik rumah (bos / kolektor pemegang)",
  security: aman,
  request: { params: idParam, body: { ...json(lokasiRumahSchema), required: true } },
  responses: berhasil,
});

const nasabahLama = createRoute({
  method: "get",
  path: "/lapangan/nasabah-lama",
  tags: ["lapangan"],
  summary: "Pegangan tanpa pinjaman aktif — calon pinjam lagi",
  security: aman,
  responses: {
    200: { description: "Nasabah lama", ...json(z.array(nasabahLamaSchema)) },
    ...galatLapangan,
  },
});

export function ruteNasabah(layanan: LayananNasabah, periksa: PeriksaTokenAkses) {
  const router = buatRouter();
  const masuk = wajibMasuk(periksa);
  router.use("/lapangan/*", masuk);
  router.use("/nasabah", masuk);
  router.use("/nasabah/*", masuk);
  return router
    .openapi(daftar, async (c) =>
      c.json(await layanan.daftar(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(serupa, async (c) =>
      c.json(await layanan.serupa(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(neraca, async (c) =>
      c.json(await layanan.neraca(c.get("aktor"), c.req.valid("param").id), 200),
    )
    .openapi(ubah, async (c) =>
      c.json(await layanan.ubah(c.get("aktor"), c.req.valid("param").id, c.req.valid("json")), 200),
    )
    .openapi(pindah, async (c) =>
      c.json(
        await layanan.pindah(c.get("aktor"), c.req.valid("param").id, c.req.valid("json")),
        200,
      ),
    )
    .openapi(lokasi, async (c) =>
      c.json(
        await layanan.rekamLokasi(c.get("aktor"), c.req.valid("param").id, c.req.valid("json")),
        200,
      ),
    )
    .openapi(nasabahLama, async (c) =>
      c.json(await layanan.daftarNasabahLama(c.get("aktor")), 200),
    );
}
