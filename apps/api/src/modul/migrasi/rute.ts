import { createRoute } from "@hono/zod-openapi";
import { hasilMigrasiSchema, migrasiSchema } from "@opennael/contracts";
import { buatRouter, jawabanGalat } from "../../router";
import type { LayananAuth } from "../auth/layanan";
import { wajibMasuk } from "../auth/wajib-masuk";
import type { LayananMigrasi } from "./layanan";

const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });

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

export function ruteMigrasi(layanan: (kunci?: string) => LayananMigrasi, auth: LayananAuth) {
  const router = buatRouter();
  router.use("/pinjaman/migrasi", wajibMasuk(auth));
  return router.openapi(salin, async (c) =>
    c.json(
      await layanan(c.req.header("Idempotency-Key")).salin(c.get("aktor"), c.req.valid("json")),
      201,
    ),
  );
}
