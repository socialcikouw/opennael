import { createRoute } from "@hono/zod-openapi";
import {
  loginSchema,
  profilSchema,
  refreshSchema,
  registrasiSchema,
  sesiSchema,
  tokenSchema,
} from "@opennael/contracts";
import { type BatasPercobaan, pembatasLoginPerNomor, pembatasPerIp } from "../../batas";
import { buatRouter, jawabanGalat } from "../../router";
import type { LayananAuth } from "./layanan";
import { wajibMasuk } from "./wajib-masuk";

const json = <T>(schema: T) => ({ content: { "application/json": { schema } } });
const aman = [{ bearer: [] }];

const register = createRoute({
  method: "post",
  path: "/auth/register",
  tags: ["auth"],
  summary: "Bos membuka kantor baru (berkode) — langsung masuk",
  request: { body: { ...json(registrasiSchema), required: true } },
  responses: {
    201: { description: "Kantor & akun bos dibuat", ...json(sesiSchema) },
    ...jawabanGalat(
      [400, "Data tidak sah"],
      [403, "Kode registrasi salah / registrasi ditutup"],
      [409, "Nomor HP sudah dipakai"],
    ),
  },
});

const login = createRoute({
  method: "post",
  path: "/auth/login",
  tags: ["auth"],
  summary: "Bos masuk dengan nomor HP + kata sandi",
  request: { body: { ...json(loginSchema), required: true } },
  responses: {
    200: { description: "Berhasil masuk", ...json(sesiSchema) },
    ...jawabanGalat(
      [400, "Data tidak sah"],
      [401, "Nomor HP atau kata sandi salah"],
      [429, "Terlalu banyak percobaan"],
    ),
  },
});

const refresh = createRoute({
  method: "post",
  path: "/auth/refresh",
  tags: ["auth"],
  summary: "Tukar token segar dengan pasangan token baru (rotasi)",
  request: { body: { ...json(refreshSchema), required: true } },
  responses: {
    200: { description: "Token baru", ...json(tokenSchema) },
    ...jawabanGalat([400, "Data tidak sah"], [401, "Sesi tidak berlaku"]),
  },
});

const keluar = createRoute({
  method: "post",
  path: "/auth/keluar",
  tags: ["auth"],
  summary: "Memutus perangkat yang sedang dipakai",
  security: aman,
  responses: {
    204: { description: "Perangkat diputus" },
    ...jawabanGalat([401, "Belum masuk"]),
  },
});

const saya = createRoute({
  method: "get",
  path: "/auth/me",
  tags: ["auth"],
  summary: "Profil pengguna yang sedang masuk",
  security: aman,
  responses: {
    200: { description: "Profil", ...json(profilSchema) },
    ...jawabanGalat([401, "Belum masuk"]),
  },
});

export function ruteAuth(
  auth: LayananAuth,
  opsi: { batas: BatasPercobaan; percayaProxy: boolean },
) {
  const masuk = wajibMasuk(auth);
  const router = buatRouter();
  const perIp = pembatasPerIp(opsi.batas, opsi.percayaProxy);
  router.use("/auth/register", perIp);
  router.use("/auth/login", perIp);
  router.use("/auth/refresh", perIp);
  router.use("/auth/login", pembatasLoginPerNomor(opsi.batas));
  router.use("/auth/keluar", masuk);
  router.use("/auth/me", masuk);
  return router
    .openapi(register, async (c) => c.json(await auth.registrasi(c.req.valid("json")), 201))
    .openapi(login, async (c) => c.json(await auth.login(c.req.valid("json")), 200))
    .openapi(refresh, async (c) => c.json(await auth.refresh(c.req.valid("json").tokenSegar), 200))
    .openapi(keluar, async (c) => {
      await auth.keluar(c.get("aktor"));
      return c.body(null, 204);
    })
    .openapi(saya, async (c) => c.json(await auth.saya(c.get("aktor")), 200));
}
