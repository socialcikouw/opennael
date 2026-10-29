import { createRoute, z } from "@hono/zod-openapi";
import {
  bukuNasabahSchema,
  peristiwaSchema,
  saringPeristiwaSchema,
  saringRekapBulananSchema,
  selRekapSchema,
  transaksiLengkapSchema,
} from "@opennael/contracts";
import { aman, jawabanGalat, json } from "../../platform/http/openapi";
import { buatRouter } from "../../platform/http/router";
import { wajibMasuk } from "../../platform/http/wajib-masuk";
import type { LayananAuth } from "../auth/layanan";
import type { LayananPeristiwa } from "./layanan";

const tag = ["peristiwa"];
const idParam = z.object({ id: z.uuid() });
const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh / bukan pegangan Anda"],
  [404, "Tidak ditemukan"],
  [422, "Rentang tanggal tidak sah"],
);

const daftar = createRoute({
  method: "get",
  path: "/transaksi/peristiwa",
  tags: tag,
  summary:
    "Peristiwa berlaku — setoran, lunas, gulung, libur (bos, pengawas; kolektor: pegangannya)",
  security: aman,
  request: { query: saringPeristiwaSchema },
  responses: { 200: { description: "Peristiwa", ...json(z.array(peristiwaSchema)) }, ...galat },
});
const rekap = createRoute({
  method: "get",
  path: "/transaksi/rekap-bulanan",
  tags: tag,
  summary: "Isi grid kartu satu bulan",
  security: aman,
  request: { query: saringRekapBulananSchema },
  responses: { 200: { description: "Sel grid", ...json(z.array(selRekapSchema)) }, ...galat },
});
const satu = createRoute({
  method: "get",
  path: "/transaksi/{id}",
  tags: tag,
  summary: "Satu transaksi, termasuk yang dibatalkan",
  security: aman,
  request: { params: idParam },
  responses: { 200: { description: "Transaksi", ...json(transaksiLengkapSchema) }, ...galat },
});
const buku = createRoute({
  method: "get",
  path: "/nasabah/{id}/buku",
  tags: tag,
  summary: "Buku nasabah — identitas, semua pinjaman, semua peristiwa",
  security: aman,
  request: { params: idParam },
  responses: { 200: { description: "Buku", ...json(bukuNasabahSchema) }, ...galat },
});

export function rutePeristiwa(layanan: LayananPeristiwa, auth: LayananAuth) {
  const router = buatRouter();
  const masuk = wajibMasuk(auth.periksaTokenAkses);
  router.use("/transaksi/*", masuk);
  router.use("/nasabah/*", masuk);
  return router
    .openapi(daftar, async (c) =>
      c.json(await layanan.daftar(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(rekap, async (c) =>
      c.json(await layanan.rekapBulanan(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(satu, async (c) =>
      c.json(await layanan.transaksi(c.get("aktor"), c.req.valid("param").id), 200),
    )
    .openapi(buku, async (c) =>
      c.json(await layanan.buku(c.get("aktor"), c.req.valid("param").id), 200),
    );
}
