import { createRoute, z } from "@hono/zod-openapi";
import {
  batalSchema,
  biayaInputSchema,
  biayaSchema,
  daftarBiayaSchema,
  daftarTransferSchema,
  hariKasSchema,
  saringBiayaSchema,
  saringHariSchema,
  terimaKasSchema,
  transaksiHariSchema,
  transferInputSchema,
  transferSchema,
  ubahHariIniSchema,
} from "@opennael/contracts";
import type { ZodObject, ZodType } from "zod";
import { buatRouter, jawabanGalat } from "../../router";
import type { LayananAuth } from "../auth/layanan";
import { wajibMasuk } from "../auth/wajib-masuk";
import type { LayananSetoranSore } from "./layanan";

const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });
const aman = [{ bearer: [] }];
const tag = ["setoran sore"];
const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh / bukan milik Anda"],
  [404, "Tidak ditemukan"],
  [409, "Kas sudah diterima / sudah ada / sudah dibatalkan"],
  [422, "Melanggar aturan usaha"],
);
const idParam = z.object({ id: z.uuid() });

const baca = <P extends string, Q extends ZodObject, S extends ZodType>(
  path: P,
  summary: string,
  query: Q,
  schema: S,
) =>
  createRoute({
    method: "get",
    path,
    tags: tag,
    summary,
    security: aman,
    request: { query },
    responses: { 200: { description: "Berhasil", ...json(schema) }, ...galat },
  });

const catat = <P extends string, B extends ZodType, S extends ZodType>(
  path: P,
  summary: string,
  body: B,
  schema: S,
) =>
  createRoute({
    method: "post",
    path,
    tags: tag,
    summary,
    security: aman,
    request: { body: { ...json(body), required: true } },
    responses: { 201: { description: "Tercatat", ...json(schema) }, ...galat },
  });

/** Semua pembatalan: bos, hari yang sama, alasan wajib (aturan-usaha L1). */
const batal = <P extends string, S extends ZodType>(path: P, summary: string, schema: S) =>
  createRoute({
    method: "post",
    path,
    tags: tag,
    summary,
    security: aman,
    request: { params: idParam, body: { ...json(batalSchema), required: true } },
    responses: { 200: { description: "Dibatalkan", ...json(schema) }, ...galat },
  });

const daftarHari = baca(
  "/hari-kolektor",
  "Hari kolektor (absen, laporan, serah terima) — kolektor: miliknya",
  saringHariSchema,
  z.array(hariKasSchema),
);
const terimaKas = createRoute({
  method: "post",
  path: "/hari-kolektor/{kolektorId}/terima-kas",
  tags: tag,
  summary: "Terima kas kolektor (kasir/bos) — hitung buta",
  security: aman,
  request: {
    params: z.object({ kolektorId: z.uuid() }),
    body: { ...json(terimaKasSchema), required: true },
  },
  responses: { 201: { description: "Kas diterima", ...json(hariKasSchema) }, ...galat },
});
const kolektorParam = z.object({ kolektorId: z.uuid() });
const ubahHariIni = createRoute({
  method: "patch",
  path: "/hari-kolektor/{kolektorId}/hari-ini",
  tags: tag,
  summary: "Betulkan kas lapangan / uang jalan hari ini (bos, sebelum kas diterima)",
  security: aman,
  request: { params: kolektorParam, body: { ...json(ubahHariIniSchema), required: true } },
  responses: { 200: { description: "Tersimpan", ...json(hariKasSchema) }, ...galat },
});
const batalLaporan = createRoute({
  method: "post",
  path: "/hari-kolektor/{kolektorId}/laporan/batal",
  tags: tag,
  summary: "Buka kembali hari kolektor yang sudah lapor (bos, sebelum kas diterima)",
  security: aman,
  request: { params: kolektorParam, body: { ...json(batalSchema), required: true } },
  responses: { 200: { description: "Laporan dibatalkan", ...json(hariKasSchema) }, ...galat },
});
const batalSerahTerima = batal(
  "/serah-terima-kas/{id}/batal",
  "Batal penerimaan kas (bos, hari yang sama)",
  hariKasSchema,
);
const daftarTransaksi = baca(
  "/transaksi",
  "Setoran berlaku satu hari beserta transfernya — pilihan transfer kasir",
  saringHariSchema,
  z.array(transaksiHariSchema),
);
const daftarTransfer = baca(
  "/transfer-setoran",
  "Transfer setoran satu hari + total",
  saringHariSchema,
  daftarTransferSchema,
);
const catatTransfer = catat(
  "/transfer-setoran",
  "Catat setoran yang dibayar lewat transfer (kasir/bos)",
  transferInputSchema,
  transferSchema,
);
const batalTransfer = batal(
  "/transfer-setoran/{id}/batal",
  "Batal transfer setoran (bos, hari yang sama)",
  transferSchema,
);
const daftarBiaya = baca(
  "/biaya-tak-terduga",
  "Biaya tak terduga per rentang tanggal + total",
  saringBiayaSchema,
  daftarBiayaSchema,
);
const catatBiaya = catat(
  "/biaya-tak-terduga",
  "Catat biaya tak terduga kolektor hari ini (kasir/bos)",
  biayaInputSchema,
  biayaSchema,
);
const batalBiaya = batal(
  "/biaya-tak-terduga/{id}/batal",
  "Batal biaya tak terduga (bos, hari yang sama)",
  biayaSchema,
);

export function ruteSetoranSore(layanan: LayananSetoranSore, auth: LayananAuth) {
  const router = buatRouter();
  for (const jalur of [
    "/hari-kolektor",
    "/hari-kolektor/*",
    "/serah-terima-kas/*",
    "/transaksi",
    "/transfer-setoran",
    "/transfer-setoran/*",
    "/biaya-tak-terduga",
    "/biaya-tak-terduga/*",
  ]) {
    router.use(jalur, wajibMasuk(auth));
  }
  return router
    .openapi(daftarHari, async (c) =>
      c.json(await layanan.daftarHari(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(terimaKas, async (c) =>
      c.json(
        await layanan.terimaKas(
          c.get("aktor"),
          c.req.valid("param").kolektorId,
          c.req.valid("json"),
        ),
        201,
      ),
    )
    .openapi(ubahHariIni, async (c) =>
      c.json(
        await layanan.ubahHariIni(
          c.get("aktor"),
          c.req.valid("param").kolektorId,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(batalLaporan, async (c) =>
      c.json(
        await layanan.batalLaporan(
          c.get("aktor"),
          c.req.valid("param").kolektorId,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(batalSerahTerima, async (c) =>
      c.json(
        await layanan.batalSerahTerima(
          c.get("aktor"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(daftarTransaksi, async (c) =>
      c.json(await layanan.daftarTransaksi(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(daftarTransfer, async (c) =>
      c.json(await layanan.daftarTransfer(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(catatTransfer, async (c) =>
      c.json(await layanan.catatTransfer(c.get("aktor"), c.req.valid("json")), 201),
    )
    .openapi(batalTransfer, async (c) =>
      c.json(
        await layanan.batalTransfer(c.get("aktor"), c.req.valid("param").id, c.req.valid("json")),
        200,
      ),
    )
    .openapi(daftarBiaya, async (c) =>
      c.json(await layanan.daftarBiaya(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(catatBiaya, async (c) =>
      c.json(await layanan.catatBiaya(c.get("aktor"), c.req.valid("json")), 201),
    )
    .openapi(batalBiaya, async (c) =>
      c.json(
        await layanan.batalBiaya(c.get("aktor"), c.req.valid("param").id, c.req.valid("json")),
        200,
      ),
    );
}
