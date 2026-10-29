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
import { aman, jawabanGalat, json } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananSetoranSore } from "./layanan";

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

export function ruteSetoranSore(
  layanan: (kunci?: string) => LayananSetoranSore,
  periksa: PeriksaTokenAkses,
) {
  const router = buatRouter();
  const masuk = wajibMasuk(periksa);
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
    router.use(jalur, masuk);
  }
  return router
    .openapi(daftarHari, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).daftarHari(
          c.get("aktor"),
          c.req.valid("query"),
        ),
        200,
      ),
    )
    .openapi(terimaKas, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).terimaKas(
          c.get("aktor"),
          c.req.valid("param").kolektorId,
          c.req.valid("json"),
        ),
        201,
      ),
    )
    .openapi(ubahHariIni, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).ubahHariIni(
          c.get("aktor"),
          c.req.valid("param").kolektorId,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(batalLaporan, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).batalLaporan(
          c.get("aktor"),
          c.req.valid("param").kolektorId,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(batalSerahTerima, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).batalSerahTerima(
          c.get("aktor"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(daftarTransaksi, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).daftarTransaksi(
          c.get("aktor"),
          c.req.valid("query"),
        ),
        200,
      ),
    )
    .openapi(daftarTransfer, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).daftarTransfer(
          c.get("aktor"),
          c.req.valid("query"),
        ),
        200,
      ),
    )
    .openapi(catatTransfer, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).catatTransfer(
          c.get("aktor"),
          c.req.valid("json"),
        ),
        201,
      ),
    )
    .openapi(batalTransfer, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).batalTransfer(
          c.get("aktor"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(daftarBiaya, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).daftarBiaya(
          c.get("aktor"),
          c.req.valid("query"),
        ),
        200,
      ),
    )
    .openapi(catatBiaya, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).catatBiaya(
          c.get("aktor"),
          c.req.valid("json"),
        ),
        201,
      ),
    )
    .openapi(batalBiaya, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).batalBiaya(
          c.get("aktor"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
    );
}
