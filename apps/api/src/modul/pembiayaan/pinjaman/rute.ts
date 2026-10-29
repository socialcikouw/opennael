import { createRoute, z } from "@hono/zod-openapi";
import {
  kartuPinjamanSchema,
  rincianPinjamanSchema,
  riwayatStatusSchema,
  saringPinjamanSchema,
  ubahPinjamanSchema,
} from "@opennael/contracts";
import { aman, jawabanGalat, json } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananPinjaman } from "./layanan";

const tag = ["pinjaman"];
const idParam = z.object({ id: z.uuid() });
const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh / bukan pegangan Anda"],
  [404, "Tidak ditemukan"],
  [409, "Nomor pinjaman sudah dipakai"],
  [422, "Melanggar aturan (pinjaman batal, tak ada perubahan)"],
);

const daftar = createRoute({
  method: "get",
  path: "/pinjaman",
  tags: tag,
  summary: "Kartu pinjaman — posisi tagih & kunci gulung (bos, pengawas; kolektor: pegangannya)",
  security: aman,
  request: { query: saringPinjamanSchema },
  responses: { 200: { description: "Daftar", ...json(z.array(kartuPinjamanSchema)) }, ...galat },
});
const satu = createRoute({
  method: "get",
  path: "/pinjaman/{id}",
  tags: tag,
  summary: "Rincian pinjaman + angka aturan macet hari ini",
  security: aman,
  request: { params: idParam },
  responses: { 200: { description: "Rincian", ...json(rincianPinjamanSchema) }, ...galat },
});
const ubah = createRoute({
  method: "patch",
  path: "/pinjaman/{id}",
  tags: tag,
  summary: "Sunting nomor urut pinjaman (bos)",
  security: aman,
  request: { params: idParam, body: { ...json(ubahPinjamanSchema), required: true } },
  responses: { 200: { description: "Tersimpan", ...json(rincianPinjamanSchema) }, ...galat },
});
const riwayatStatus = createRoute({
  method: "get",
  path: "/pinjaman/{id}/riwayat-status",
  tags: tag,
  summary: "Garis waktu status pinjaman (bos, pengawas)",
  security: aman,
  request: { params: idParam },
  responses: {
    200: { description: "Garis waktu", ...json(z.array(riwayatStatusSchema)) },
    ...galat,
  },
});

export function rutePinjaman(layanan: LayananPinjaman, periksa: PeriksaTokenAkses) {
  const router = buatRouter();
  const masuk = wajibMasuk(periksa);
  router.use("/pinjaman", masuk);
  router.use("/pinjaman/*", masuk);
  return router
    .openapi(daftar, async (c) =>
      c.json(await layanan.daftar(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(satu, async (c) =>
      c.json(await layanan.satu(c.get("aktor"), c.req.valid("param").id), 200),
    )
    .openapi(ubah, async (c) =>
      c.json(await layanan.ubah(c.get("aktor"), c.req.valid("param").id, c.req.valid("json")), 200),
    )
    .openapi(riwayatStatus, async (c) =>
      c.json(await layanan.riwayatStatus(c.get("aktor"), c.req.valid("param").id), 200),
    );
}
