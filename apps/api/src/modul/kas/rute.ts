import { createRoute, z } from "@hono/zod-openapi";
import {
  batalSchema,
  bukaKasSchema,
  bukuKasSchema,
  idParamSchema,
  laporanKasSchema,
  mutasiInputSchema,
  mutasiSchema,
  pencocokanInputSchema,
  pencocokanSchema,
  posisiModalSchema,
  saringPosisiModalSchema,
  saringRentangSchema,
  ubahKasAwalSchema,
} from "@opennael/contracts";
import type { ZodType } from "zod";
import { aman, jawabanGalat, json } from "../../platform/http/openapi";
import { buatRouter } from "../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../platform/http/wajib-masuk";
import type { LayananKas } from "./layanan";

const tag = ["kas kantor"];
const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh"],
  [404, "Tidak ditemukan"],
  [409, "Sudah dibuka / sudah dibatalkan"],
  [422, "Melanggar aturan usaha (buku belum dibuka, arah akun, keterangan selisih)"],
);

const tulis = <P extends string, B extends ZodType, S extends ZodType>(
  method: "post" | "patch",
  path: P,
  summary: string,
  body: B,
  schema: S,
) =>
  createRoute({
    method,
    path,
    tags: tag,
    summary,
    security: aman,
    request: { body: { ...json(body), required: true } },
    responses: { 200: { description: "Berhasil", ...json(schema) }, ...galat },
  });

/** Semua pembatalan: bos, hari yang sama, alasan wajib (aturan-usaha L1). */
const batal = <P extends string, S extends ZodType>(path: P, summary: string, schema: S) =>
  createRoute({
    method: "post",
    path,
    tags: tag,
    summary,
    security: aman,
    request: {
      params: idParamSchema,
      body: { ...json(batalSchema), required: true },
    },
    responses: { 200: { description: "Dibatalkan", ...json(schema) }, ...galat },
  });

const buka = tulis(
  "post",
  "/kas/buka",
  "Buka buku kas kantor (bos, sekali)",
  bukaKasSchema,
  bukuKasSchema,
);
const ubahKasAwal = tulis(
  "patch",
  "/kas/buka",
  "Betulkan kas awal (bos, hanya di hari pembukaan)",
  ubahKasAwalSchema,
  bukuKasSchema,
);
const laporan = createRoute({
  method: "get",
  path: "/kas/laporan",
  tags: tag,
  summary: "Laporan kas per rentang tanggal (bos saja)",
  security: aman,
  request: { query: saringRentangSchema },
  responses: { 200: { description: "Laporan", ...json(laporanKasSchema) }, ...galat },
});
const posisiModal = createRoute({
  method: "get",
  path: "/kas/posisi-modal",
  tags: tag,
  summary: "Posisi modal di akhir satu tanggal (bos saja)",
  security: aman,
  request: { query: saringPosisiModalSchema },
  responses: { 200: { description: "Posisi modal", ...json(posisiModalSchema) }, ...galat },
});
const catatMutasi = tulis(
  "post",
  "/kas/mutasi",
  "Catat mutasi kas kantor (bos) — hari ini",
  mutasiInputSchema,
  mutasiSchema,
);
const batalMutasi = batal(
  "/kas/mutasi/{id}/batal",
  "Batal mutasi (bos, hari yang sama)",
  mutasiSchema,
);
const cocokkan = tulis(
  "post",
  "/kas/pencocokan",
  "Cocokkan kas (bos/pengawas) — hitung buta",
  pencocokanInputSchema,
  pencocokanSchema,
);
const batalPencocokan = batal(
  "/kas/pencocokan/{id}/batal",
  "Batal pencocokan — salah hitung (bos, hari yang sama)",
  pencocokanSchema,
);
const daftarPencocokan = createRoute({
  method: "get",
  path: "/kas/pencocokan",
  tags: tag,
  summary: "Riwayat pencocokan — bos: semua; pengawas: miliknya",
  security: aman,
  request: { query: saringRentangSchema },
  responses: {
    200: { description: "Riwayat", ...json(z.array(pencocokanSchema)) },
    ...galat,
  },
});

export function ruteKas(kas: (kunci?: string) => LayananKas, periksa: PeriksaTokenAkses) {
  const router = buatRouter();
  router.use("/kas/*", wajibMasuk(periksa));
  return router
    .openapi(buka, async (c) =>
      c.json(
        await kas(c.req.header("Idempotency-Key")).bukaKas(c.get("aktor"), c.req.valid("json")),
        200,
      ),
    )
    .openapi(ubahKasAwal, async (c) =>
      c.json(
        await kas(c.req.header("Idempotency-Key")).ubahKasAwal(c.get("aktor"), c.req.valid("json")),
        200,
      ),
    )
    .openapi(laporan, async (c) =>
      c.json(
        await kas(c.req.header("Idempotency-Key")).laporan(c.get("aktor"), c.req.valid("query")),
        200,
      ),
    )
    .openapi(posisiModal, async (c) =>
      c.json(
        await kas(c.req.header("Idempotency-Key")).posisiModal(
          c.get("aktor"),
          c.req.valid("query"),
        ),
        200,
      ),
    )
    .openapi(catatMutasi, async (c) =>
      c.json(
        await kas(c.req.header("Idempotency-Key")).catatMutasi(c.get("aktor"), c.req.valid("json")),
        200,
      ),
    )
    .openapi(batalMutasi, async (c) =>
      c.json(
        await kas(c.req.header("Idempotency-Key")).batalMutasi(
          c.get("aktor"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(cocokkan, async (c) =>
      c.json(
        await kas(c.req.header("Idempotency-Key")).cocokkan(c.get("aktor"), c.req.valid("json")),
        200,
      ),
    )
    .openapi(batalPencocokan, async (c) =>
      c.json(
        await kas(c.req.header("Idempotency-Key")).batalPencocokan(
          c.get("aktor"),
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(daftarPencocokan, async (c) =>
      c.json(
        await kas(c.req.header("Idempotency-Key")).daftarPencocokan(
          c.get("aktor"),
          c.req.valid("query"),
        ),
        200,
      ),
    );
}
