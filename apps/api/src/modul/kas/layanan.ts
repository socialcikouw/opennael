import type { Db } from "../../platform/db/klien";
import { denganIdempotensi } from "../../platform/idempotensi";
import { bacaKalender } from "../kantor";
import type { Konteks } from "./data";
import { buatKueriKas } from "./kueri";
import { buatBatalMutasi } from "./operasi/batal-mutasi";
import { buatBatalPencocokan } from "./operasi/batal-pencocokan";
import { buatBukaKas } from "./operasi/buka-kas";
import { buatCatatMutasi } from "./operasi/catat-mutasi";
import { buatCocokkan } from "./operasi/cocokkan";
import { buatUbahKasAwal } from "./operasi/ubah-kas-awal";

/**
 * KAS KANTOR — buku kas (titik nol), mutasi tangan bos, laporan kas (bos),
 * dan pencocokan kas hitung buta (bos & pengawas). Docs: schema-buku-kas.md,
 * schema-mutasi-kas-kantor.md, schema-pencocokan-kas.md.
 */
export interface KasDeps {
  db: Db;
  sekarang?: () => Date;
}

export function buatLayananKas(deps: KasDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const k: Konteks = {
    db: deps.db,
    sekarang,
    hariIni: async (aktor) => (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal,
  };
  return {
    ...buatKueriKas(k),
    bukaKas: buatBukaKas(k),
    ubahKasAwal: buatUbahKasAwal(k),
    catatMutasi: buatCatatMutasi(k),
    batalMutasi: buatBatalMutasi(k),
    cocokkan: buatCocokkan(k),
    batalPencocokan: buatBatalPencocokan(k),
  };
}

export type LayananKas = ReturnType<typeof buatLayananKas>;

/**
 * Layanan dengan operasi tulis idempoten (header `Idempotency-Key`): tiap
 * operasi di bawah dijalankan sekali dalam satu transaksi dan hasilnya diputar
 * ulang untuk kunci yang sama.
 */
export function buatLayananKasIdempoten(deps: KasDeps) {
  return denganIdempotensi(deps.db, "kas", (db) => buatLayananKas({ ...deps, db }), [
    "bukaKas",
    "ubahKasAwal",
    "catatMutasi",
    "batalMutasi",
    "cocokkan",
    "batalPencocokan",
  ]);
}
