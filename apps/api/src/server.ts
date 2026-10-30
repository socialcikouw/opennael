import { buatApp } from "./app";
import { bacaEnv } from "./env";
import { mulaiJadwal } from "./jadwal";
import { buatDb } from "./platform/db/klien";
import { buatLog } from "./platform/log";

const env = bacaEnv();
const log = buatLog(env.LOG_LEVEL);
const { db } = buatDb(env.DATABASE_URL);
const app = buatApp({
  db,
  log,
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
log.info({ port: server.port, dokumentasi: "/dokumentasi" }, "OpenNael API menyala");
if (!env.KODE_REGISTRASI) {
  log.warn("Registrasi kantor baru DITUTUP (KODE_REGISTRASI kosong)");
}
const gerbangMati = [
  env.VALIDASI_JAM_KERJA ? null : "jam kerja",
  env.VALIDASI_HARI_KERJA ? null : "hari kerja",
  env.VALIDASI_LIBUR_KANTOR ? null : "libur kantor",
].filter((x) => x !== null);
if (gerbangMati.length > 0) {
  log.warn({ gerbangMati }, "Gerbang lapangan TIDAK memeriksa (pengembangan)");
}

mulaiJadwal(db, log);
