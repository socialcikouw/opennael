import { createRoute } from "@hono/zod-openapi";
import {
  hasilKlaimSchema,
  idParamSchema,
  klaimTautanSchema,
  mintaTautanSchema,
  persetujuanTautanSchema,
  setujuiTautanSchema,
  tautanBaruSchema,
} from "@opennael/contracts";
import { type BatasPercobaan, pembatasPerIp } from "../../../platform/http/batas";
import { jawabanGalat, json } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananTautan } from "./layanan";

const minta = createRoute({
  method: "post",
  path: "/auth/tautan",
  tags: ["tautan"],
  summary: "HP yang belum masuk meminta kode penautan (QR)",
  request: { body: { ...json(mintaTautanSchema), required: true } },
  responses: {
    201: { description: "Kode dibuat; kunci klaim dikirim sekali", ...json(tautanBaruSchema) },
    ...jawabanGalat([400, "Data tidak sah"], [429, "Terlalu banyak permintaan"]),
  },
});

const setujui = createRoute({
  method: "post",
  path: "/auth/tautan/setujui",
  tags: ["tautan"],
  summary: "Bos menyetujui kode: akun yang ada atau akun baru kasir/pengawas/kolektor",
  security: [{ bearer: [] }],
  request: { body: { ...json(setujuiTautanSchema), required: true } },
  responses: {
    200: { description: "Disetujui; HP peminta kini bisa klaim", ...json(persetujuanTautanSchema) },
    ...jawabanGalat(
      [400, "Data tidak sah"],
      [401, "Belum masuk"],
      [403, "Bukan bos / akun bos tak bisa ditautkan"],
      [404, "Kode atau akun tidak ditemukan"],
    ),
  },
});

const klaim = createRoute({
  method: "post",
  path: "/auth/tautan/{id}/klaim",
  tags: ["tautan"],
  summary: "HP peminta menukar kunci klaim dengan sesi (ditanya berulang sampai disetujui)",
  request: {
    params: idParamSchema,
    body: { ...json(klaimTautanSchema), required: true },
  },
  responses: {
    200: { description: "menunggu / kedaluwarsa / tertaut (+ sesi)", ...json(hasilKlaimSchema) },
    ...jawabanGalat(
      [400, "Data tidak sah"],
      [403, "Akun dinonaktifkan"],
      [404, "Tautan tidak ditemukan"],
      [409, "Tautan sudah dipakai"],
    ),
  },
});

export function ruteTautan(
  tautan: LayananTautan,
  periksa: PeriksaTokenAkses,
  opsi: { batas: BatasPercobaan; percayaProxy: boolean },
) {
  const router = buatRouter();
  // Klaim TIDAK dibatasi per IP: HP bertanya tiap beberapa detik selama
  // menunggu; menebak kunci klaim 32 bait acak mustahil.
  router.use("/auth/tautan", pembatasPerIp(opsi.batas, opsi.percayaProxy));
  router.use("/auth/tautan/setujui", wajibMasuk(periksa));
  return router
    .openapi(minta, async (c) => c.json(await tautan.minta(c.req.valid("json").perangkat), 201))
    .openapi(setujui, async (c) =>
      c.json(await tautan.setujui(c.get("aktor"), c.req.valid("json")), 200),
    )
    .openapi(klaim, async (c) =>
      c.json(await tautan.klaim(c.req.valid("param").id, c.req.valid("json").klaim), 200),
    );
}
