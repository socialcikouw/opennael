import { createRoute, z } from "@hono/zod-openapi";
import {
  absenSchema,
  akadSchema,
  bayarSchema,
  gulungSchema,
  hariKolektorSchema,
  hasilGulungSchema,
  kampungPilihanSchema,
  kartuTagihSchema,
  liburSchema,
  liburTercatatSchema,
  lunasSchema,
  nasabahLamaSchema,
  pinjamanSchema,
  transaksiSchema,
} from "@opennael/contracts";
import type { ZodType } from "zod";
import { buatRouter, jawabanGalat } from "../../router";
import type { LayananAuth } from "../auth/layanan";
import { wajibMasuk } from "../auth/wajib-masuk";
import type { LayananLapangan } from "./layanan";

const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });
const aman = [{ bearer: [] }];
const galatLapangan = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Bukan kolektor / bukan pegangan Anda"],
  [404, "Tidak ditemukan"],
  [409, "Sudah ada catatan hari ini"],
  [422, "Melanggar aturan usaha (gerbang lapangan, rumus, rem bos)"],
);

const tulis = <P extends string, B extends ZodType, S extends ZodType>(
  path: P,
  summary: string,
  body: B,
  schema: S,
) =>
  createRoute({
    method: "post",
    path,
    tags: ["lapangan"],
    summary,
    security: aman,
    request: { body: { content: { "application/json": { schema: body } }, required: true } },
    responses: {
      201: { description: "Berhasil", content: { "application/json": { schema } } },
      ...galatLapangan,
    },
  });

const absen = tulis(
  "/lapangan/absen",
  "Kolektor absen pagi (sekali sehari)",
  absenSchema,
  hariKolektorSchema,
);
const akad = tulis(
  "/lapangan/akad",
  "Akad pinjaman baru (orang baru / pinjam lagi)",
  akadSchema,
  pinjamanSchema,
);
const bayar = tulis("/lapangan/bayar", "Setoran angsuran", bayarSchema, transaksiSchema);
const lunas = tulis(
  "/lapangan/lunas",
  "Pelunasan — tabungan menutup saldo lebih dulu",
  lunasSchema,
  transaksiSchema,
);
const gulung = tulis(
  "/lapangan/gulung",
  "Gulung — pinjaman lama dilunasi pinjaman baru",
  gulungSchema,
  hasilGulungSchema,
);
const libur = tulis(
  "/lapangan/libur",
  "Libur nasabah — tidak ditagih hari ini",
  liburSchema,
  liburTercatatSchema,
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

const daftar = createRoute({
  method: "get",
  path: "/lapangan/pinjaman",
  tags: ["lapangan"],
  summary: "Pinjaman aktif yang dipegang kolektor ini",
  security: aman,
  responses: {
    200: { description: "Kartu tagih", ...json(z.array(kartuTagihSchema)) },
    ...galatLapangan,
  },
});

const kampung = createRoute({
  method: "get",
  path: "/lapangan/kampung",
  tags: ["lapangan"],
  summary: "Kampung kantor ini — pilihan formulir akad (kolektor) & salinan migrasi (bos)",
  security: aman,
  responses: {
    200: { description: "Kampung", ...json(z.array(kampungPilihanSchema)) },
    ...galatLapangan,
  },
});

const nasabahLama = createRoute({
  method: "get",
  path: "/lapangan/nasabah-lama",
  tags: ["lapangan"],
  summary: "Pegangan tanpa pinjaman aktif — calon pinjam lagi",
  security: aman,
  responses: {
    200: { description: "Nasabah lama", ...json(z.array(nasabahLamaSchema)) },
    ...galatLapangan,
  },
});

export function ruteLapangan(lapangan: LayananLapangan, auth: LayananAuth) {
  const router = buatRouter();
  router.use("/lapangan/*", wajibMasuk(auth));
  return router
    .openapi(hariIni, async (c) => c.json(await lapangan.keadaanHariIni(c.get("aktor")), 200))
    .openapi(absen, async (c) =>
      c.json(await lapangan.absen(c.get("aktor"), c.req.valid("json")), 201),
    )
    .openapi(laporan, async (c) => c.json(await lapangan.bukaLaporan(c.get("aktor")), 200))
    .openapi(daftar, async (c) => c.json(await lapangan.daftarPinjaman(c.get("aktor")), 200))
    .openapi(kampung, async (c) => c.json(await lapangan.daftarKampung(c.get("aktor")), 200))
    .openapi(nasabahLama, async (c) =>
      c.json(await lapangan.daftarNasabahLama(c.get("aktor")), 200),
    )
    .openapi(akad, async (c) =>
      c.json(await lapangan.akad(c.get("aktor"), c.req.valid("json")), 201),
    )
    .openapi(bayar, async (c) =>
      c.json(await lapangan.bayar(c.get("aktor"), c.req.valid("json")), 201),
    )
    .openapi(lunas, async (c) =>
      c.json(await lapangan.lunas(c.get("aktor"), c.req.valid("json")), 201),
    )
    .openapi(gulung, async (c) =>
      c.json(await lapangan.gulung(c.get("aktor"), c.req.valid("json")), 201),
    )
    .openapi(libur, async (c) =>
      c.json(await lapangan.libur(c.get("aktor"), c.req.valid("json")), 201),
    );
}
