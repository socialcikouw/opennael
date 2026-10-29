import { createRoute } from "@hono/zod-openapi";
import { hasilMigrasiSchema, migrasiSchema } from "@opennael/contracts";
import { jawabanGalat, json } from "../../platform/http/openapi";
import { buatRouter } from "../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../platform/http/wajib-masuk";
import type { LayananMigrasi } from "./layanan";

const salin = createRoute({
  method: "post",
  path: "/pinjaman/migrasi",
  tags: ["pinjaman"],
  summary: "Salin pinjaman berjalan dari buku lama — tanpa uang keluar (bos, aturan-usaha A10)",
  security: [{ bearer: [] }],
  request: { body: { ...json(migrasiSchema), required: true } },
  responses: {
    201: { description: "Tersalin", ...json(hasilMigrasiSchema) },
    ...jawabanGalat(
      [400, "Data tidak sah"],
      [401, "Belum masuk"],
      [403, "Peran tidak boleh"],
      [404, "Nasabah / kolektor tidak ditemukan"],
      [409, "NIK terdaftar / pinjaman masih aktif"],
      [422, "Melanggar aturan usaha (pokok, tenor, saldo, tanggal, nomor pinjaman, blokir)"],
    ),
  },
});

export function ruteMigrasi(
  layanan: (kunci?: string) => LayananMigrasi,
  periksa: PeriksaTokenAkses,
) {
  const router = buatRouter();
  router.use("/pinjaman/migrasi", wajibMasuk(periksa));
  return router.openapi(salin, async (c) =>
    c.json(
      await layanan(c.req.header("Idempotency-Key")).salin(c.get("aktor"), c.req.valid("json")),
      201,
    ),
  );
}
