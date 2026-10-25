import { createRoute, z } from "@hono/zod-openapi";
import { fotoTersimpanSchema, UKURAN_FOTO_MAKS, unggahFotoSchema } from "@opennael/contracts";
import { bodyLimit } from "hono/body-limit";
import { GalatApp } from "../../galat";
import { buatRouter, jawabanGalat } from "../../router";
import type { LayananAuth } from "../auth/layanan";
import { wajibMasuk } from "../auth/wajib-masuk";
import type { LayananFoto } from "./layanan";

// `z.file()` belum dikenal penyusun OpenAPI — dinyatakan sebagai biner multipart.
const formulirFoto = unggahFotoSchema.extend({
  berkas: z.file().openapi({ type: "string", format: "binary" }),
});

const unggah = createRoute({
  method: "post",
  path: "/foto",
  tags: ["foto"],
  summary: "Unggah foto bukti dari kamera HP (serah terima / KTP)",
  security: [{ bearer: [] }],
  request: {
    body: { content: { "multipart/form-data": { schema: formulirFoto } }, required: true },
  },
  responses: {
    201: {
      description: "Foto tersimpan",
      content: { "application/json": { schema: fotoTersimpanSchema } },
    },
    ...jawabanGalat(
      [400, "Data tidak sah"],
      [401, "Belum masuk"],
      [403, "Peran tidak boleh"],
      [409, "Foto yang sama sudah pernah diunggah"],
      [413, "Berkas terlalu besar"],
      [422, "Bukan foto JPEG/WebP, ukuran, atau lokasi tidak lengkap"],
    ),
  },
});

const baca = createRoute({
  method: "get",
  path: "/foto/{id}",
  tags: ["foto"],
  summary: "Isi berkas foto — bos, pengawas, atau pengunggahnya",
  security: [{ bearer: [] }],
  request: { params: z.object({ id: z.uuid() }) },
  responses: {
    200: {
      description: "Berkas gambar",
      content: { "image/webp": { schema: z.any() }, "image/jpeg": { schema: z.any() } },
    },
    ...jawabanGalat([401, "Belum masuk"], [403, "Tidak boleh"], [404, "Tidak ditemukan"]),
  },
});

export function ruteFoto(foto: LayananFoto, auth: LayananAuth) {
  const router = buatRouter();
  router.use("/foto", wajibMasuk(auth));
  router.use("/foto/*", wajibMasuk(auth));
  // Ruang sedikit di atas 2 MB untuk kepala multipart.
  router.use(
    "/foto",
    bodyLimit({
      maxSize: UKURAN_FOTO_MAKS + 64 * 1024,
      onError: () => {
        throw new GalatApp(413, "BERKAS_TERLALU_BESAR", "Foto paling besar 2 MB");
      },
    }),
  );
  return router
    .openapi(unggah, async (c) =>
      c.json(await foto.unggah(c.get("aktor"), c.req.valid("form")), 201),
    )
    .openapi(baca, async (c) => {
      const f = await foto.baca(c.get("aktor"), c.req.valid("param").id);
      return c.body(f.isi, 200, {
        "Content-Type": f.tipeMime,
        "Cache-Control": "private, max-age=3600",
      });
    });
}
