import { createRoute, z } from "@hono/zod-openapi";
import {
  batalSchema,
  hasilLiburKantorSchema,
  kantorSchema,
  liburKantorInputSchema,
  liburKantorSchema,
  pekanKerjaInputSchema,
  pekanKerjaSchema,
  remAktifSchema,
  remBerlakuSchema,
  remInputSchema,
  remNasabahInputSchema,
  saringLiburKantorSchema,
  saringTarifBerlakuSchema,
  tarifBerlakuSchema,
  tarifInputSchema,
  tarifSchema,
  ubahKantorSchema,
} from "@opennael/contracts";
import type { ZodType } from "zod";
import { buatRouter, jawabanGalat } from "../../router";
import type { LayananAuth } from "../auth/layanan";
import { wajibMasuk } from "../auth/wajib-masuk";
import type { LayananPengaturan } from "./layanan";

const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });
const aman = [{ bearer: [] }];
const tag = ["pengaturan"];
const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh"],
  [404, "Tidak ditemukan"],
  [422, "Melanggar aturan (mundur, jam, rentang, hari sudah berjalan, tarif kantor)"],
);
const berhasil = <S extends ZodType>(schema: S) => ({
  200: { description: "Berhasil", ...json(schema) },
  ...galat,
});

const baca = <P extends string, S extends ZodType>(path: P, summary: string, schema: S) =>
  createRoute({
    method: "get",
    path,
    tags: tag,
    summary,
    security: aman,
    responses: berhasil(schema),
  });

const tulis = <P extends string, B extends ZodType, S extends ZodType>(
  method: "put" | "patch" | "post",
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
    responses: berhasil(schema),
  });

const kantor = baca("/kantor", "Profil kantor + pola hari kerja hari ini", kantorSchema);
const ubahKantor = tulis(
  "patch",
  "/kantor",
  "Ubah profil kantor (bos)",
  ubahKantorSchema,
  kantorSchema,
);
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

const remBerlaku = baca("/kebijakan", "Rem yang berlaku bagi pembaca", remBerlakuSchema);
const remAktif = baca(
  "/kebijakan/aktif",
  "Semua rem yang menyala (bos, pengawas)",
  z.array(remAktifSchema),
);
const remKantor = tulis(
  "put",
  "/kebijakan/kantor",
  "Rem lapis kantor (bos)",
  remInputSchema,
  remBerlakuSchema,
);
const remKolektor = createRoute({
  method: "put",
  path: "/kebijakan/kolektor/{kolektorId}",
  tags: tag,
  summary: "Rem lapis kolektor (bos)",
  security: aman,
  request: {
    params: z.object({ kolektorId: z.uuid() }),
    body: { ...json(remInputSchema), required: true },
  },
  responses: berhasil(remBerlakuSchema),
});
const remNasabah = createRoute({
  method: "put",
  path: "/kebijakan/nasabah/{nasabahId}",
  tags: tag,
  summary: "Rem lapis nasabah — tanpa saklar pinjaman baru (bos)",
  security: aman,
  request: {
    params: z.object({ nasabahId: z.uuid() }),
    body: { ...json(remNasabahInputSchema), required: true },
  },
  responses: berhasil(remBerlakuSchema),
});

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
    params: z.object({ tanggal: z.iso.date() }),
    body: { ...json(batalSchema), required: true },
  },
  responses: berhasil(liburKantorSchema),
});

const daftarTarif = baca("/tarif-gaji", "Riwayat tarif gaji (bos, pengawas)", z.array(tarifSchema));
const tarifBerlaku = createRoute({
  method: "get",
  path: "/tarif-gaji/berlaku",
  tags: tag,
  summary: "Tarif gaji hari ini + sumbernya — kolektor: miliknya",
  security: aman,
  request: { query: saringTarifBerlakuSchema },
  responses: berhasil(tarifBerlakuSchema),
});
const aturTarif = tulis(
  "put",
  "/tarif-gaji",
  "Atur tarif gaji kantor / khusus kolektor — tidak boleh mundur (bos)",
  tarifInputSchema,
  tarifSchema,
);

export function rutePengaturan(layanan: LayananPengaturan, auth: LayananAuth) {
  const router = buatRouter();
  for (const jalur of [
    "/kantor",
    "/kantor/*",
    "/kebijakan",
    "/kebijakan/*",
    "/libur-kantor",
    "/libur-kantor/*",
    "/tarif-gaji",
    "/tarif-gaji/*",
  ]) {
    router.use(jalur, wajibMasuk(auth));
  }
  return router
    .openapi(kantor, async (c) => c.json(await layanan.kantor(c.get("aktor")), 200))
    .openapi(ubahKantor, async (c) =>
      c.json(await layanan.ubahKantor(c.get("aktor"), c.req.valid("json")), 200),
    )
    .openapi(daftarPekan, async (c) => c.json(await layanan.daftarPekanKerja(c.get("aktor")), 200))
    .openapi(aturPekan, async (c) =>
      c.json(await layanan.aturPekanKerja(c.get("aktor"), c.req.valid("json")), 200),
    )
    .openapi(remBerlaku, async (c) => c.json(await layanan.kebijakanBerlaku(c.get("aktor")), 200))
    .openapi(remAktif, async (c) => c.json(await layanan.remAktif(c.get("aktor")), 200))
    .openapi(remKantor, async (c) =>
      c.json(await layanan.remKantor(c.get("aktor"), c.req.valid("json")), 200),
    )
    .openapi(remKolektor, async (c) =>
      c.json(
        await layanan.remKolektor(
          c.get("aktor"),
          c.req.valid("param").kolektorId,
          c.req.valid("json"),
        ),
        200,
      ),
    )
    .openapi(remNasabah, async (c) =>
      c.json(
        await layanan.remNasabah(
          c.get("aktor"),
          c.req.valid("param").nasabahId,
          c.req.valid("json"),
        ),
        200,
      ),
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
    .openapi(daftarTarif, async (c) => c.json(await layanan.daftarTarif(c.get("aktor")), 200))
    .openapi(tarifBerlaku, async (c) =>
      c.json(await layanan.tarifBerlaku(c.get("aktor"), c.req.valid("query")), 200),
    )
    .openapi(aturTarif, async (c) =>
      c.json(await layanan.aturTarif(c.get("aktor"), c.req.valid("json")), 200),
    );
}
