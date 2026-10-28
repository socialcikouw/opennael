import { fileURLToPath } from "node:url";
import { createRoute } from "@hono/zod-openapi";
import { sehatSchema } from "@opennael/contracts";
import { Scalar } from "@scalar/hono-api-reference";
import { BATAS_BAWAAN, type BatasPercobaan } from "./batas";
import type { Db } from "./db/klien";
import { tanganiGalat } from "./galat";
import { buatLayananAktivitas } from "./modul/aktivitas/layanan";
import { ruteAktivitas } from "./modul/aktivitas/rute";
import { buatLayananAuth } from "./modul/auth/layanan";
import { ruteAuth } from "./modul/auth/rute";
import { buatLayananFoto } from "./modul/foto/layanan";
import { ruteFoto } from "./modul/foto/rute";
import { buatLayananGaji } from "./modul/gaji/layanan";
import { ruteGaji } from "./modul/gaji/rute";
import { buatLayananKas } from "./modul/kas/layanan";
import { ruteKas } from "./modul/kas/rute";
import type { ValidasiKalender } from "./modul/lapangan/gerbang";
import { buatLayananLapangan } from "./modul/lapangan/layanan";
import { ruteLapangan } from "./modul/lapangan/rute";
import { buatLayananMigrasi } from "./modul/migrasi/layanan";
import { ruteMigrasi } from "./modul/migrasi/rute";
import { buatLayananNasabah } from "./modul/nasabah/layanan";
import { ruteNasabah } from "./modul/nasabah/rute";
import { buatLayananPembatalan } from "./modul/pembatalan/layanan";
import { rutePembatalan } from "./modul/pembatalan/rute";
import { buatLayananPemutihan } from "./modul/pemutihan/layanan";
import { rutePemutihan } from "./modul/pemutihan/rute";
import { buatLayananPengaturan } from "./modul/pengaturan/layanan";
import { rutePengaturan } from "./modul/pengaturan/rute";
import { buatLayananPengguna } from "./modul/pengguna/layanan";
import { rutePengguna } from "./modul/pengguna/rute";
import { buatLayananPerangkat } from "./modul/perangkat/layanan";
import { rutePerangkat } from "./modul/perangkat/rute";
import { buatLayananPeristiwa } from "./modul/peristiwa/layanan";
import { rutePeristiwa } from "./modul/peristiwa/rute";
import { buatLayananPinjaman } from "./modul/pinjaman/layanan";
import { rutePinjaman } from "./modul/pinjaman/rute";
import { buatLayananRingkasan } from "./modul/ringkasan/layanan";
import { ruteRingkasan } from "./modul/ringkasan/rute";
import { buatLayananRute } from "./modul/rute/layanan";
import { ruteRuteKolektor } from "./modul/rute/rute";
import { buatLayananSetoranSore } from "./modul/setoran-sore/layanan";
import { ruteSetoranSore } from "./modul/setoran-sore/rute";
import { buatLayananTabungan } from "./modul/tabungan/layanan";
import { ruteTabungan } from "./modul/tabungan/rute";
import { buatLayananTautan } from "./modul/tautan/layanan";
import { ruteTautan } from "./modul/tautan/rute";
import { buatLayananWilayah } from "./modul/wilayah/layanan";
import { ruteWilayah } from "./modul/wilayah/rute";
import { type Penyimpanan, penyimpananDisk } from "./penyimpanan";
import { denganIdempotensi } from "./platform/idempotensi";
import { buatRouter } from "./router";

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
  const tautan = buatLayananTautan({ db: deps.db, auth, sekarang: deps.sekarang });
  const lapangan = denganIdempotensi(
    deps.db,
    "lapangan",
    (db) =>
      buatLayananLapangan({
        db,
        sekarang: deps.sekarang,
        validasiKalender: deps.validasiKalender,
      }),
    ["absen", "bukaLaporan", "akad", "bayar", "lunas", "gulung", "libur"],
  );
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
  const peristiwa = buatLayananPeristiwa({
    db: deps.db,
    nasabah: nasabahKantor,
    pinjaman: pinjamanKantor,
  });
  const pengaturan = buatLayananPengaturan({ db: deps.db, sekarang: deps.sekarang });
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
    .route("/", ruteTautan(tautan, auth, opsi))
    .route("/", ruteLapangan(lapangan, auth))
    .route("/", ruteFoto(foto, auth))
    .route("/", ruteSetoranSore(setoranSore, auth))
    .route("/", ruteGaji(gaji, auth))
    .route("/", ruteKas(kas, auth))
    .route("/", ruteTabungan(tabungan, auth))
    .route("/", ruteMigrasi(migrasi, auth))
    .route("/", rutePembatalan(pembatalan, auth))
    .route("/", rutePemutihan(pemutihan, auth))
    .route("/", rutePengguna(penggunaKantor, auth))
    .route("/", ruteNasabah(nasabahKantor, auth))
    .route("/", rutePinjaman(pinjamanKantor, auth))
    .route("/", rutePeristiwa(peristiwa, auth))
    .route("/", ruteWilayah(kampung, auth))
    .route("/", rutePerangkat(perangkatMasuk, auth))
    .route("/", rutePengaturan(pengaturan, auth))
    .route("/", ruteRuteKolektor(rute, auth))
    .route("/", ruteRingkasan(ringkasan, auth))
    .route("/", ruteAktivitas(aktivitas, auth));

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
