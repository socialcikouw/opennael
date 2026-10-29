import { buatApp } from "./app";
import { bacaEnv } from "./env";
import { mulaiJadwal } from "./jadwal";
import { buatDb } from "./platform/db/klien";

const env = bacaEnv();
const { db } = buatDb(env.DATABASE_URL);
const app = buatApp({
  db,
  jwtRahasia: env.JWT_RAHASIA,
  sesiRahasia: env.SESI_RAHASIA,
  kodeRegistrasi: env.KODE_REGISTRASI,
  percayaProxy: env.PERCAYA_PROXY,
  validasiKalender: {
    jamKerja: env.VALIDASI_JAM_KERJA,
    hariKerja: env.VALIDASI_HARI_KERJA,
    liburKantor: env.VALIDASI_LIBUR_KANTOR,
  },
});

const server = Bun.serve({ port: env.PORT, fetch: app.fetch });
console.log(`OpenNael API di http://localhost:${server.port}`);
if (!env.KODE_REGISTRASI) console.log("Registrasi kantor baru DITUTUP (KODE_REGISTRASI kosong)");
const gerbangMati = [
  env.VALIDASI_JAM_KERJA ? null : "jam kerja",
  env.VALIDASI_HARI_KERJA ? null : "hari kerja",
  env.VALIDASI_LIBUR_KANTOR ? null : "libur kantor",
].filter((x) => x !== null);
if (gerbangMati.length > 0) {
  console.log(`Gerbang lapangan TIDAK memeriksa: ${gerbangMati.join(", ")} (pengembangan)`);
}

mulaiJadwal(db);
