import type { Db } from "../../../platform/db/klien";
import { denganIdempotensi } from "../../../platform/idempotensi";
import { bacaKalender } from "../../kantor";
import type { Konteks } from "./data";
import { buatKueriGaji } from "./kueri";
import { buatBatalGaji } from "./operasi/batal";
import { buatBayarGaji } from "./operasi/bayar";

/**
 * GAJI KOLEKTOR — pratinjau & pembayaran memakai SATU perhitungan (aturan-
 * usaha J): storting per hari × tarif yang berlaku hari itu, potongan tekor
 * dari serah terima kas + arsip tekor lama. Hasilnya dibekukan di
 * `pembayaran_gaji`. Docs: schema-pembayaran-gaji.md, schema-tarif-gaji.md.
 */
export interface GajiDeps {
  db: Db;
  sekarang?: () => Date;
}

export function buatLayananGaji(deps: GajiDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const k: Konteks = {
    db: deps.db,
    sekarang,
    hariIni: async (aktor) => (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal,
  };
  return {
    ...buatKueriGaji(k),
    bayar: buatBayarGaji(k),
    batal: buatBatalGaji(k),
  };
}

export type LayananGaji = ReturnType<typeof buatLayananGaji>;

/**
 * Layanan dengan operasi tulis idempoten (header `Idempotency-Key`): tiap
 * operasi di bawah dijalankan sekali dalam satu transaksi dan hasilnya diputar
 * ulang untuk kunci yang sama.
 */
export function buatLayananGajiIdempoten(deps: GajiDeps) {
  return denganIdempotensi(deps.db, "gaji", (db) => buatLayananGaji({ ...deps, db }), [
    "bayar",
    "batal",
  ]);
}
