import { createRoute, z } from "@hono/zod-openapi";
import {
  batalSchema,
  hasilBatalAkadSchema,
  hasilBatalTransaksiSchema,
  liburTercatatSchema,
} from "@opennael/contracts";
import type { ZodType } from "zod";
import { buatRouter, jawabanGalat } from "../../router";
import type { LayananAuth } from "../auth/layanan";
import { wajibMasuk } from "../auth/wajib-masuk";
import type { LayananPembatalan } from "./layanan";

const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });
const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh"],
  [404, "Tidak ditemukan"],
  [409, "Sudah dibatalkan / kas sudah diterima"],
  [422, "Bukan hari yang sama / pinjaman sudah berubah / sudah ada peristiwa"],
);

/** Pembatalan bos: hari yang sama, alasan wajib (aturan-usaha L1). */
const batal = <P extends string, S extends ZodType>(path: P, summary: string, schema: S) =>
  createRoute({
    method: "post",
    path,
    tags: ["pembatalan"],
    summary,
    security: [{ bearer: [] }],
    request: {
      params: z.object({ id: z.uuid() }),
      body: { ...json(batalSchema), required: true },
    },
    responses: { 200: { description: "Dibatalkan", ...json(schema) }, ...galat },
  });

const batalTransaksi = batal(
  "/transaksi/{id}/batal",
  "Batal transaksi kolektor — angsuran, pelunasan, gulung (bos, hari yang sama)",
  hasilBatalTransaksiSchema,
);
const batalAkad = batal(
  "/pinjaman/{id}/batal",
  "Batal akad salah input (bos, hari akad — salinan migrasi: hari disalin — sebelum ada peristiwa)",
  hasilBatalAkadSchema,
);
const hapusLibur = batal(
  "/transaksi/libur/{id}/hapus",
  "Hapus tanda libur nasabah yang salah (bos, hari yang sama)",
  liburTercatatSchema,
);

export function rutePembatalan(layanan: (kunci?: string) => LayananPembatalan, auth: LayananAuth) {
  const router = buatRouter();
  router.use("/transaksi/*", wajibMasuk(auth));
  router.use("/pinjaman/*", wajibMasuk(auth));
  return router
    .openapi(batalTransaksi, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).batalTransaksi(
          c.get("aktor"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(batalAkad, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).batalAkad(
          c.get("aktor"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(hapusLibur, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).hapusLibur(
          c.get("aktor"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
    );
}
