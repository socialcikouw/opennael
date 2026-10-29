import { createRoute, z } from "@hono/zod-openapi";
import {
  nonaktifkanSchema,
  penggunaSchema,
  saringPenggunaSchema,
  ubahPenggunaSchema,
} from "@opennael/contracts";
import { aman, jawabanGalat, json } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananPengguna } from "./layanan";

const tag = ["karyawan"];
const idParam = z.object({ id: z.uuid() });
const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh"],
  [404, "Tidak ditemukan"],
  [409, "Sudah nonaktif / nomor HP dipakai"],
  [422, "Melanggar aturan (diri sendiri, masih memegang nasabah, resort, nomor HP bos)"],
);
const berhasil = { 200: { description: "Berhasil", ...json(penggunaSchema) }, ...galat };

const daftar = createRoute({
  method: "get",
  path: "/pengguna",
  tags: tag,
  summary: "Daftar akun kantor — kasir & pengawas: kolektor saja",
  security: aman,
  request: { query: saringPenggunaSchema },
  responses: { 200: { description: "Daftar", ...json(z.array(penggunaSchema)) }, ...galat },
});
const ubah = createRoute({
  method: "patch",
  path: "/pengguna/{id}",
  tags: tag,
  summary: "Sunting nama, nomor HP, resort (bos)",
  security: aman,
  request: { params: idParam, body: { ...json(ubahPenggunaSchema), required: true } },
  responses: berhasil,
});
const nonaktifkan = createRoute({
  method: "post",
  path: "/pengguna/{id}/nonaktifkan",
  tags: tag,
  summary: "Nonaktifkan akun — semua perangkat diputus (bos)",
  security: aman,
  request: { params: idParam, body: { ...json(nonaktifkanSchema), required: true } },
  responses: berhasil,
});
const aktifkan = createRoute({
  method: "post",
  path: "/pengguna/{id}/aktifkan",
  tags: tag,
  summary: "Aktifkan kembali — perangkat ditautkan ulang (bos)",
  security: aman,
  request: { params: idParam },
  responses: berhasil,
});

export function rutePengguna(layanan: LayananPengguna, periksa: PeriksaTokenAkses) {
  const router = buatRouter();
  const masuk = wajibMasuk(periksa);
  router.use("/pengguna", masuk);
  router.use("/pengguna/*", masuk);
  return router
    .openapi(daftar, async (c) =>
      c.json(await layanan.daftar(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(ubah, async (c) =>
      c.json(await layanan.ubah(c.get("aktor"), c.req.valid("param").id, c.req.valid("json")), 200),
    )
    .openapi(nonaktifkan, async (c) =>
      c.json(
        await layanan.nonaktifkan(c.get("aktor"), c.req.valid("param").id, c.req.valid("json")),
        200,
      ),
    )
    .openapi(aktifkan, async (c) =>
      c.json(await layanan.aktifkan(c.get("aktor"), c.req.valid("param").id), 200),
    );
}
