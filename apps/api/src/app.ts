import { fileURLToPath } from "node:url";
import { createRoute } from "@hono/zod-openapi";
import { sehatSchema } from "@opennael/contracts";
import { Scalar } from "@scalar/hono-api-reference";
import { requestId } from "hono/request-id";
import {
  buatLayananAbsensiIdempoten,
  buatLayananRute,
  buatLayananSetoranSoreIdempoten,
  ruteAbsensi,
  ruteRuteKolektor,
  ruteSetoranSore,
} from "./modul/hari-kolektor";
import {
  buatLayananAuth,
  buatLayananPengguna,
  buatLayananPerangkat,
  buatLayananTautan,
  ruteAuth,
  rutePengguna,
  rutePerangkat,
  ruteTautan,
} from "./modul/identitas";
import {
  buatLayananKalender,
  buatLayananKebijakan,
  buatLayananProfil,
  buatLayananWilayah,
  ruteKalender,
  ruteKebijakan,
  ruteProfil,
  ruteWilayah,
  type ValidasiKalender,
} from "./modul/kantor";
import { buatLayananKasIdempoten, ruteKas } from "./modul/kas";
import { buatLayananMigrasiIdempoten, ruteMigrasi } from "./modul/migrasi";
import {
  buatLayananAktivitas,
  buatLayananRingkasan,
  ruteAktivitas,
  ruteRingkasan,
} from "./modul/pelaporan";
import {
  buatLayananAkadIdempoten,
  buatLayananFoto,
  buatLayananNasabah,
  buatLayananPembatalanIdempoten,
  buatLayananPemutihan,
  buatLayananPeristiwaIdempoten,
  buatLayananPinjaman,
  buatLayananTabunganIdempoten,
  ruteAkad,
  ruteFoto,
  ruteNasabah,
  rutePembatalan,
  rutePemutihan,
  rutePeristiwa,
  rutePinjaman,
  ruteTabungan,
} from "./modul/pembiayaan";
import {
  buatLayananGajiIdempoten,
  buatLayananTarif,
  ruteGaji,
  ruteTarif,
} from "./modul/penggajian";
import type { Db } from "./platform/db/klien";
import { BATAS_BAWAAN, type BatasPercobaan } from "./platform/http/batas";
import { tanganiGalat } from "./platform/http/galat";
import { middlewareLog } from "./platform/http/log";
import { buatRouter } from "./platform/http/router";
import { type Log, logDiam } from "./platform/log";
import { type Penyimpanan, penyimpananDisk } from "./platform/penyimpanan";

const sehat = createRoute({
  method: "get",
  path: "/sehat",
  tags: ["sistem"],
  summary: "Server hidup dan menjawab",
  responses: {
    200: {
      description: "Server sehat",
      content: { "application/json": { schema: sehatSchema } },
    },
  },
});

export interface AppDeps {
  db: Db;
  jwtRahasia: string;
  sesiRahasia: string;
  kodeRegistrasi?: string | undefined;
  /** Jam — diganti di uji. */
  sekarang?: () => Date;
  /** Di belakang Nginx: alamat klien dibaca dari header proxy. */
  percayaProxy?: boolean;
  /** Batas percobaan masuk — bawaan `BATAS_BAWAAN`. */
  batas?: BatasPercobaan;
  /** Penyimpanan berkas foto — bawaan disk `apps/api/.berkas/`. */
  penyimpanan?: Penyimpanan;
  /** Pemeriksaan kalender gerbang lapangan — bawaan semua dijalankan. */
  validasiKalender?: ValidasiKalender;
  /** Log permintaan & galat tak terduga — bawaan diam (uji). */
  log?: Log;
}

/**
 * Aplikasi Hono tanpa server — diuji lewat `app.request(...)`, dijalankan
 * `server.ts`. Modul rute dipasang di sini; tipenya (`App`) dipakai klien
 * RPC `hc` di aplikasi.
 */
export function buatApp(deps: AppDeps) {
  const log = deps.log ?? logDiam;
  const auth = buatLayananAuth(deps);
  const periksa = auth.periksaTokenAkses;
  const tautan = buatLayananTautan({ db: deps.db, auth, sekarang: deps.sekarang });
  const sekarang = deps.sekarang;
  const gerbang = { db: deps.db, sekarang, validasiKalender: deps.validasiKalender };
  const absensi = buatLayananAbsensiIdempoten(gerbang);
  const akad = buatLayananAkadIdempoten(gerbang);
  const setoranSore = buatLayananSetoranSoreIdempoten({ db: deps.db, sekarang });
  const kas = buatLayananKasIdempoten({ db: deps.db, sekarang });
  const gaji = buatLayananGajiIdempoten({ db: deps.db, sekarang });
  const pembatalan = buatLayananPembatalanIdempoten({ db: deps.db, sekarang });
  const pemutihan = buatLayananPemutihan({ db: deps.db, sekarang });
  const penggunaKantor = buatLayananPengguna({ db: deps.db, sekarang });
  const nasabahKantor = buatLayananNasabah({ db: deps.db });
  const pinjamanKantor = buatLayananPinjaman({ db: deps.db, sekarang });
  const kampung = buatLayananWilayah({ db: deps.db, sekarang });
  const perangkatMasuk = buatLayananPerangkat({ db: deps.db, sekarang });
  const peristiwa = buatLayananPeristiwaIdempoten({
    ...gerbang,
    nasabah: nasabahKantor,
    pinjaman: pinjamanKantor,
  });
  const profil = buatLayananProfil({ db: deps.db, sekarang });
  const kalender = buatLayananKalender({ db: deps.db, sekarang });
  const kebijakan = buatLayananKebijakan({ db: deps.db });
  const tarif = buatLayananTarif({ db: deps.db, sekarang });
  const ringkasan = buatLayananRingkasan({ db: deps.db, sekarang });
  const rute = buatLayananRute({ db: deps.db });
  const migrasi = buatLayananMigrasiIdempoten({ db: deps.db, sekarang });
  const aktivitas = buatLayananAktivitas({ db: deps.db, sekarang });
  const tabungan = buatLayananTabunganIdempoten({ db: deps.db, sekarang });
  const foto = buatLayananFoto({
    db: deps.db,
    penyimpanan:
      deps.penyimpanan ?? penyimpananDisk(fileURLToPath(new URL("../.berkas", import.meta.url))),
    sekarang: deps.sekarang,
  });
  const opsi = { batas: deps.batas ?? BATAS_BAWAAN, percayaProxy: deps.percayaProxy ?? false };

  // Middleware didaftarkan sebelum rute mana pun (urutan registrasi menentukan).
  const dasar = buatRouter();
  dasar.use("*", requestId());
  dasar.use("*", middlewareLog(log));

  const app = dasar
    .openapi(sehat, (c) => c.json({ status: "ok" as const, waktu: new Date().toISOString() }, 200))
    .route("/", ruteAuth(auth, opsi))
    .route("/", ruteTautan(tautan, periksa, opsi))
    .route("/", ruteAbsensi(absensi, periksa))
    .route("/", ruteAkad(akad, periksa))
    .route("/", ruteFoto(foto, periksa))
    .route("/", ruteSetoranSore(setoranSore, periksa))
    .route("/", ruteGaji(gaji, periksa))
    .route("/", ruteKas(kas, periksa))
    .route("/", ruteTabungan(tabungan, periksa))
    .route("/", ruteMigrasi(migrasi, periksa))
    .route("/", rutePembatalan(pembatalan, periksa))
    .route("/", rutePemutihan(pemutihan, periksa))
    .route("/", rutePengguna(penggunaKantor, periksa))
    .route("/", ruteNasabah(nasabahKantor, periksa))
    .route("/", rutePinjaman(pinjamanKantor, periksa))
    .route("/", rutePeristiwa(peristiwa, periksa))
    .route("/", ruteWilayah(kampung, periksa))
    .route("/", rutePerangkat(perangkatMasuk, periksa))
    .route("/", ruteProfil(profil, periksa))
    .route("/", ruteKalender(kalender, periksa))
    .route("/", ruteKebijakan(kebijakan, periksa))
    .route("/", ruteTarif(tarif, periksa))
    .route("/", ruteRuteKolektor(rute, periksa))
    .route("/", ruteRingkasan(ringkasan, periksa))
    .route("/", ruteAktivitas(aktivitas, periksa));

  app.onError((err, c) => tanganiGalat(err, c, log));
  app.openAPIRegistry.registerComponent("securitySchemes", "bearer", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });
  app.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: { title: "OpenNael API", version: "0.0.0" },
  });
  app.get("/dokumentasi", Scalar({ url: "/openapi.json" }));

  return app;
}

export type App = ReturnType<typeof buatApp>;
