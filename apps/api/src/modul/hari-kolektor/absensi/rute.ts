import { createRoute, z } from "@hono/zod-openapi";
import { absenSchema, hariKolektorSchema } from "@opennael/contracts";
import { aman, galatLapangan, json, tulisLapangan } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananAbsensi } from "./layanan";

const absen = tulisLapangan(
  "/lapangan/absen",
  "Kolektor absen pagi (sekali sehari)",
  absenSchema,
  hariKolektorSchema,
);

const hariIni = createRoute({
  method: "get",
  path: "/lapangan/hari-ini",
  tags: ["lapangan"],
  summary: "Kalender kantor & absensi kolektor hari ini",
  security: aman,
  responses: {
    200: {
      description: "Keadaan hari ini",
      ...json(
        z.object({
          kalender: z.object({
            tanggal: z.string(),
            dalamJamKerja: z.boolean(),
            hariKerja: z.boolean(),
            liburKantor: z.string().nullable(),
          }),
          hari: hariKolektorSchema.nullable(),
        }),
      ),
    },
    ...galatLapangan,
  },
});

const laporan = createRoute({
  method: "post",
  path: "/lapangan/laporan",
  tags: ["lapangan"],
  summary: "Buka laporan — operasi lapangan berhenti hari ini",
  security: aman,
  responses: {
    200: { description: "Laporan dibuka", ...json(hariKolektorSchema) },
    ...galatLapangan,
  },
});

export function ruteAbsensi(
  absensi: (kunci?: string) => LayananAbsensi,
  periksa: PeriksaTokenAkses,
) {
  const router = buatRouter();
  router.use("/lapangan/*", wajibMasuk(periksa));
  return router
    .openapi(hariIni, async (c) =>
      c.json(await absensi(c.req.header("Idempotency-Key")).keadaanHariIni(c.get("aktor")), 200),
    )
    .openapi(absen, async (c) =>
      c.json(
        await absensi(c.req.header("Idempotency-Key")).absen(c.get("aktor"), c.req.valid("json")),
        201,
      ),
    )
    .openapi(laporan, async (c) =>
      c.json(await absensi(c.req.header("Idempotency-Key")).bukaLaporan(c.get("aktor")), 200),
    );
}
