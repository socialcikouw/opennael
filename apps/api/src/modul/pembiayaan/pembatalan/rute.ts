import { createRoute } from "@hono/zod-openapi";
import {
  batalSchema,
  hasilBatalAkadSchema,
  hasilBatalTransaksiSchema,
  idParamSchema,
  liburTercatatSchema,
} from "@opennael/contracts";
import type { ZodType } from "zod";
import { jawabanGalat, json } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananPembatalan } from "./layanan";

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
      params: idParamSchema,
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

export function rutePembatalan(
  layanan: (kunci?: string) => LayananPembatalan,
  periksa: PeriksaTokenAkses,
) {
  const router = buatRouter();
  const masuk = wajibMasuk(periksa);
  router.use("/transaksi/*", masuk);
  router.use("/pinjaman/*", masuk);
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
