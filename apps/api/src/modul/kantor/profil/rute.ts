import { kantorSchema, ubahKantorSchema } from "@opennael/contracts";
import { jawabanGalat, pembuatRute } from "../../../platform/http/openapi";
import { buatRouter } from "../../../platform/http/router";
import { type PeriksaTokenAkses, wajibMasuk } from "../../../platform/http/wajib-masuk";
import type { LayananProfil } from "./layanan";

const galat = jawabanGalat(
  [400, "Data tidak sah"],
  [401, "Belum masuk"],
  [403, "Peran tidak boleh"],
  [404, "Tidak ditemukan"],
  [422, "Melanggar aturan (mundur, jam, rentang, hari sudah berjalan, tarif kantor)"],
);
const { baca, tulis } = pembuatRute(["pengaturan"], galat);

const kantor = baca("/kantor", "Profil kantor + pola hari kerja hari ini", kantorSchema);
const ubahKantor = tulis(
  "patch",
  "/kantor",
  "Ubah profil kantor (bos)",
  ubahKantorSchema,
  kantorSchema,
);

export function ruteProfil(layanan: LayananProfil, periksa: PeriksaTokenAkses) {
  const router = buatRouter();
  const masuk = wajibMasuk(periksa);
  router.use("/kantor", masuk);
  router.use("/kantor/*", masuk);
  return router
    .openapi(kantor, async (c) => c.json(await layanan.kantor(c.get("aktor")), 200))
    .openapi(ubahKantor, async (c) =>
      c.json(await layanan.ubahKantor(c.get("aktor"), c.req.valid("json")), 200),
    );
}
