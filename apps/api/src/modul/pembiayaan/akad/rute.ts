import { akadSchema, gulungSchema, hasilGulungSchema, pinjamanSchema } from "@opennael/contracts";
import { tulisLapangan } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananAkad } from "./layanan";

const akad = tulisLapangan(
  "/lapangan/akad",
  "Akad pinjaman baru (orang baru / pinjam lagi)",
  akadSchema,
  pinjamanSchema,
);
const gulung = tulisLapangan(
  "/lapangan/gulung",
  "Gulung — pinjaman lama dilunasi pinjaman baru",
  gulungSchema,
  hasilGulungSchema,
);

export function ruteAkad(layanan: (kunci?: string) => LayananAkad, periksa: PeriksaTokenAkses) {
  const router = buatRouter();
  router.use("/lapangan/*", wajibMasuk(periksa));
  return router
    .openapi(akad, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).akad(c.get("aktor"), c.req.valid("json")),
        201,
      ),
    )
    .openapi(gulung, async (c) =>
      c.json(
        await layanan(c.req.header("Idempotency-Key")).gulung(c.get("aktor"), c.req.valid("json")),
        201,
      ),
    );
}
