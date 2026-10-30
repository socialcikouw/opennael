import { createRoute, z } from "@hono/zod-openapi";
import {
  batalSchema,
  hasilLiburKantorSchema,
  kalenderBulanSchema,
  liburKantorInputSchema,
  liburKantorSchema,
  pekanKerjaInputSchema,
  pekanKerjaSchema,
  saringKalenderBulanSchema,
  saringLiburKantorSchema,
  tanggalParamSchema,
} from "@opennael/contracts";
import {
  aman,
  galatLapangan,
  jawabanGalat,
  json,
  pembuatRute,
} from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananKalender } from "./layanan";

const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh"],
  [404, "Tidak ditemukan"],
  [422, "Melanggar aturan (mundur, jam, rentang, hari sudah berjalan, tarif kantor)"],
);
const { berhasil, baca, tulis } = pembuatRute(["pengaturan"], galat);

const tag = ["pengaturan"];
const daftarPekan = baca(
  "/kantor/pekan-kerja",
  "Riwayat pekan kerja (bos, pengawas)",
  z.array(pekanKerjaSchema),
);
const aturPekan = tulis(
  "put",
  "/kantor/pekan-kerja",
  "Atur pekan kerja — tidak boleh mundur (bos)",
  pekanKerjaInputSchema,
  pekanKerjaSchema,
);

const daftarLibur = createRoute({
  method: "get",
  path: "/libur-kantor",
  tags: tag,
  summary: "Libur kantor dalam rentang (semua peran)",
  security: aman,
  request: { query: saringLiburKantorSchema },
  responses: berhasil(z.array(liburKantorSchema)),
});
const deklarasiLibur = tulis(
  "post",
  "/libur-kantor",
  "Deklarasi libur kantor — hari ini atau ke depan (bos)",
  liburKantorInputSchema,
  hasilLiburKantorSchema,
);
const batalLibur = createRoute({
  method: "post",
  path: "/libur-kantor/{tanggal}/batal",
  tags: tag,
  summary: "Batal libur kantor yang belum tiba (bos)",
  security: aman,
  request: {
    params: tanggalParamSchema,
    body: { ...json(batalSchema), required: true },
  },
  responses: berhasil(liburKantorSchema),
});

const kalenderBulan = createRoute({
  method: "get",
  path: "/lapangan/kalender",
  tags: ["lapangan"],
  summary: "Kalender kantor sebulan — hari tagih & libur kantor (grid setoran kartu)",
  security: aman,
  request: { query: saringKalenderBulanSchema },
  responses: {
    200: { description: "Kalender bulan", ...json(kalenderBulanSchema) },
    ...galatLapangan,
  },
});

export function ruteKalender(layanan: LayananKalender, periksa: PeriksaTokenAkses) {
  const router = buatRouter();
  const masuk = wajibMasuk(periksa);
  router.use("/kantor/pekan-kerja", masuk);
  router.use("/libur-kantor", masuk);
  router.use("/libur-kantor/*", masuk);
  router.use("/lapangan/*", masuk);
  return router
    .openapi(daftarPekan, async (c) => c.json(await layanan.daftarPekanKerja(c.get("aktor")), 200))
    .openapi(aturPekan, async (c) =>
      c.json(await layanan.aturPekanKerja(c.get("aktor"), c.req.valid("json")), 200),
    )
    .openapi(daftarLibur, async (c) =>
      c.json(await layanan.daftarLibur(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(deklarasiLibur, async (c) =>
      c.json(await layanan.deklarasiLibur(c.get("aktor"), c.req.valid("json")), 200),
    )
    .openapi(batalLibur, async (c) =>
      c.json(
        await layanan.batalLibur(c.get("aktor"), c.req.valid("param").tanggal, c.req.valid("json")),
        200,
      ),
    )
    .openapi(kalenderBulan, async (c) =>
      c.json(await layanan.kalenderBulan(c.get("aktor"), c.req.valid("query").bulan), 200),
    );
}
