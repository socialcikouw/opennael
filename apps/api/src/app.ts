import { fileURLToPath } from "node:url";
import { createRoute } from "@hono/zod-openapi";
import { sehatSchema } from "@opennael/contracts";
import { Scalar } from "@scalar/hono-api-reference";
import {
  buatLayananAbsensi,
  buatLayananRute,
  buatLayananSetoranSore,
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
import { buatLayananKas, ruteKas } from "./modul/kas";
import { buatLayananMigrasi, ruteMigrasi } from "./modul/migrasi";
import {
  buatLayananAktivitas,
  buatLayananRingkasan,
  ruteAktivitas,
  ruteRingkasan,
} from "./modul/pelaporan";
import {
  buatLayananAkad,
  buatLayananFoto,
  buatLayananNasabah,
  buatLayananPembatalan,
  buatLayananPemutihan,
  buatLayananPeristiwa,
  buatLayananPinjaman,
  buatLayananTabungan,
  ruteAkad,
  ruteFoto,
  ruteNasabah,
  rutePembatalan,
  rutePemutihan,
  rutePeristiwa,
  rutePinjaman,
  ruteTabungan,
} from "./modul/pembiayaan";
import { buatLayananGaji, buatLayananTarif, ruteGaji, ruteTarif } from "./modul/penggajian";
import type { Db } from "./platform/db/klien";
import { BATAS_BAWAAN, type BatasPercobaan } from "./platform/http/batas";
import { tanganiGalat } from "./platform/http/galat";
import { buatRouter } from "./platform/http/router";
import { denganIdempotensi } from "./platform/idempotensi";
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
}

/**
 * Aplikasi Hono tanpa server — diuji lewat `app.request(...)`, dijalankan
 * `server.ts`. Modul rute dipasang di sini; tipenya (`App`) dipakai klien
 * RPC `hc` di aplikasi.
 */
export function buatApp(deps: AppDeps) {
  const auth = buatLayananAuth(deps);
  const periksa = auth.periksaTokenAkses;
  const tautan = buatLayananTautan({ db: deps.db, auth, sekarang: deps.sekarang });
  // Nama operasi idempoten tetap "lapangan" supaya kunci yang beredar tetap berlaku.
  const gerbang = (db: Db) => ({
    db,
    sekarang: deps.sekarang,
    validasiKalender: deps.validasiKalender,
  });
  const absensi = denganIdempotensi(deps.db, "lapangan", (db) => buatLayananAbsensi(gerbang(db)), [
    "absen",
    "bukaLaporan",
  ]);
  const akad = denganIdempotensi(deps.db, "lapangan", (db) => buatLayananAkad(gerbang(db)), [
    "akad",
    "gulung",
  ]);
  const setoranSore = denganIdempotensi(
    deps.db,
    "setoran-sore",
    (db) => buatLayananSetoranSore({ db, sekarang: deps.sekarang }),
    [
      "terimaKas",
      "batalSerahTerima",
      "ubahHariIni",
      "batalLaporan",
      "catatTransfer",
      "batalTransfer",
      "catatBiaya",
      "batalBiaya",
    ],
  );
  const kas = denganIdempotensi(
    deps.db,
    "kas",
    (db) => buatLayananKas({ db, sekarang: deps.sekarang }),
    ["bukaKas", "ubahKasAwal", "catatMutasi", "batalMutasi", "cocokkan", "batalPencocokan"],
  );
  const gaji = denganIdempotensi(
    deps.db,
    "gaji",
    (db) => buatLayananGaji({ db, sekarang: deps.sekarang }),
    ["bayar", "batal"],
  );
  const pembatalan = denganIdempotensi(
    deps.db,
    "pembatalan",
    (db) => buatLayananPembatalan({ db, sekarang: deps.sekarang }),
    ["batalTransaksi", "batalAkad", "hapusLibur"],
  );
  const pemutihan = buatLayananPemutihan({ db: deps.db, sekarang: deps.sekarang });
  const penggunaKantor = buatLayananPengguna({ db: deps.db, sekarang: deps.sekarang });
  const nasabahKantor = buatLayananNasabah({ db: deps.db });
  const pinjamanKantor = buatLayananPinjaman({ db: deps.db, sekarang: deps.sekarang });
  const kampung = buatLayananWilayah({ db: deps.db, sekarang: deps.sekarang });
  const perangkatMasuk = buatLayananPerangkat({ db: deps.db, sekarang: deps.sekarang });
  const peristiwa = denganIdempotensi(
    deps.db,
    "lapangan",
    (db) =>
      buatLayananPeristiwa({
        ...gerbang(db),
        nasabah: nasabahKantor,
        pinjaman: pinjamanKantor,
      }),
    ["bayar", "lunas", "libur"],
  );
  const profil = buatLayananProfil({ db: deps.db, sekarang: deps.sekarang });
  const kalender = buatLayananKalender({ db: deps.db, sekarang: deps.sekarang });
  const kebijakan = buatLayananKebijakan({ db: deps.db });
  const tarif = buatLayananTarif({ db: deps.db, sekarang: deps.sekarang });
  const ringkasan = buatLayananRingkasan({ db: deps.db, sekarang: deps.sekarang });
  const rute = buatLayananRute({ db: deps.db });
  const migrasi = denganIdempotensi(
    deps.db,
    "migrasi",
    (db) => buatLayananMigrasi({ db, sekarang: deps.sekarang }),
    ["salin"],
  );
  const aktivitas = buatLayananAktivitas({ db: deps.db, sekarang: deps.sekarang });
  const tabungan = denganIdempotensi(
    deps.db,
    "tabungan",
    (db) => buatLayananTabungan({ db, sekarang: deps.sekarang }),
    ["tarik", "batalPenarikan", "koreksi"],
  );
  const foto = buatLayananFoto({
    db: deps.db,
    penyimpanan:
      deps.penyimpanan ?? penyimpananDisk(fileURLToPath(new URL("../.berkas", import.meta.url))),
    sekarang: deps.sekarang,
  });
  const opsi = { batas: deps.batas ?? BATAS_BAWAAN, percayaProxy: deps.percayaProxy ?? false };

  const app = buatRouter()
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

  app.onError(tanganiGalat);
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
