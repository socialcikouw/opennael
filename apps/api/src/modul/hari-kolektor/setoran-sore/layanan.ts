import type { Db } from "../../../platform/db/klien";
import { denganIdempotensi } from "../../../platform/idempotensi";
import { bacaKalender } from "../../kantor";
import type { Konteks } from "./data";
import { buatKueriSetoranSore } from "./kueri";
import { buatBatalBiaya } from "./operasi/batal-biaya";
import { buatBatalLaporan } from "./operasi/batal-laporan";
import { buatBatalSerahTerima } from "./operasi/batal-serah-terima";
import { buatBatalTransfer } from "./operasi/batal-transfer";
import { buatCatatBiaya } from "./operasi/catat-biaya";
import { buatCatatTransfer } from "./operasi/catat-transfer";
import { buatTerimaKas } from "./operasi/terima-kas";
import { buatUbahHariIni } from "./operasi/ubah-hari-ini";

/**
 * SETORAN SORE — kasir menerima kas kolektor dengan hitung buta, mencatat
 * transfer setoran & biaya tak terduga; bos membatalkan (hari yang sama).
 * Sesudah kas diterima hari itu terkunci (aturan-usaha I4) — diperiksa di
 * sini lebih dulu, dijaga trigger `*_terkunci` di database.
 * Lihat docs/skema/schema-serah-terima-kas.md.
 */
export interface SetoranSoreDeps {
  db: Db;
  sekarang?: () => Date;
}

export function buatLayananSetoranSore(deps: SetoranSoreDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const k: Konteks = {
    db: deps.db,
    sekarang,
    hariIni: async (aktor) => (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal,
  };
  return {
    ...buatKueriSetoranSore(k),
    terimaKas: buatTerimaKas(k),
    batalSerahTerima: buatBatalSerahTerima(k),
    ubahHariIni: buatUbahHariIni(k),
    batalLaporan: buatBatalLaporan(k),
    catatTransfer: buatCatatTransfer(k),
    batalTransfer: buatBatalTransfer(k),
    catatBiaya: buatCatatBiaya(k),
    batalBiaya: buatBatalBiaya(k),
  };
}

export type LayananSetoranSore = ReturnType<typeof buatLayananSetoranSore>;

/**
 * Layanan dengan operasi tulis idempoten (header `Idempotency-Key`): tiap
 * operasi di bawah dijalankan sekali dalam satu transaksi dan hasilnya diputar
 * ulang untuk kunci yang sama.
 */
export function buatLayananSetoranSoreIdempoten(deps: SetoranSoreDeps) {
  return denganIdempotensi(
    deps.db,
    "setoran-sore",
    (db) => buatLayananSetoranSore({ ...deps, db }),
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
}
