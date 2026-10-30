import { createRoute, z } from "@hono/zod-openapi";
import {
  bayarSchema,
  bukuNasabahSchema,
  idParamSchema,
  liburSchema,
  liburTercatatSchema,
  lunasSchema,
  peristiwaSchema,
  saringPeristiwaSchema,
  saringRekapBulananSchema,
  selRekapSchema,
  transaksiLengkapSchema,
  transaksiSchema,
} from "@opennael/contracts";
import { aman, jawabanGalat, json, tulisLapangan } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananPeristiwa } from "./layanan";

const tag = ["peristiwa"];
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
  request: { params: idParamSchema },
  responses: { 200: { description: "Transaksi", ...json(transaksiLengkapSchema) }, ...galat },
});
const buku = createRoute({
  method: "get",
  path: "/nasabah/{id}/buku",
  tags: tag,
  summary: "Buku nasabah — identitas, semua pinjaman, semua peristiwa",
  security: aman,
  request: { params: idParamSchema },
  responses: { 200: { description: "Buku", ...json(bukuNasabahSchema) }, ...galat },
});

const bayar = tulisLapangan("/lapangan/bayar", "Setoran angsuran", bayarSchema, transaksiSchema);
const lunas = tulisLapangan(
  "/lapangan/lunas",
  "Pelunasan — tabungan menutup saldo lebih dulu",
  lunasSchema,
  transaksiSchema,
);
const libur = tulisLapangan(
  "/lapangan/libur",
  "Libur nasabah — tidak ditagih hari ini",
  liburSchema,
  liburTercatatSchema,
);

export function rutePeristiwa(
  layanan: (kunci?: string) => LayananPeristiwa,
  periksa: PeriksaTokenAkses,
) {
  const router = buatRouter();
  const masuk = wajibMasuk(periksa);
  router.use("/transaksi/*", masuk);
  router.use("/nasabah/*", masuk);
  router.use("/lapangan/*", masuk);
  return router
    .openapi(daftar, async (c) =>
      c.json(await layanan().daftar(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(rekap, async (c) =>
      c.json(await layanan().rekapBulanan(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(satu, async (c) =>
      c.json(await layanan().transaksi(c.get("aktor"), c.req.valid("param").id), 200),
    )
    .openapi(buku, async (c) =>
      c.json(await layanan().buku(c.get("aktor"), c.req.valid("param").id), 200),
    )
    .openapi(bayar, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).bayar(c.get("aktor"), c.req.valid("json")),
        201,
      ),
    )
    .openapi(lunas, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).lunas(c.get("aktor"), c.req.valid("json")),
        201,
      ),
    )
    .openapi(libur, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).libur(c.get("aktor"), c.req.valid("json")),
        201,
      ),
    );
}
