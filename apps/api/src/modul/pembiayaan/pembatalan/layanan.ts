import type { Db } from "../../../platform/db/klien";
import { denganIdempotensi } from "../../../platform/idempotensi";
import { bacaKalender } from "../../kantor";
import type { Konteks } from "./data";
import { buatBatalAkad } from "./operasi/batal-akad";
import { buatBatalTransaksi } from "./operasi/batal-transaksi";
import { buatHapusLibur } from "./operasi/hapus-libur";

/**
 * PEMBATALAN OLEH BOS (aturan-usaha L) — hari yang sama, alasan wajib,
 * sebelum kas kolektor hari itu diterima (I4). Pembatalan membalik persis
 * yang ditulis operasi lapangan, di satu transaksi database:
 *
 *   batal angsuran  : saldo pinjaman kembali
 *   batal pelunasan : pinjaman dibuka lagi (status sebelum lunas, termasuk
 *                     tanggal macetnya) & tabungan keluar dikembalikan
 *   batal gulung    : penerus dibatalkan lebih dulu (belum ada peristiwa),
 *                     tabungan masuknya ditarik, lalu asal dibuka lagi
 *   batal akad      : status batal & tabungan masuk ditarik (L2: sebelum
 *                     ada peristiwa; akad gulung lewat batal gulung)
 *
 * Transfer setoran yang menempel pada transaksi ikut dibatalkan.
 * Docs: schema-transaksi.md, schema-pinjaman.md, schema-transfer-setoran.md.
 */
export interface PembatalanDeps {
  db: Db;
  sekarang?: () => Date;
}

export function buatLayananPembatalan(deps: PembatalanDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const k: Konteks = {
    db: deps.db,
    sekarang,
    hariIni: async (aktor) => (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal,
  };
  return {
    batalTransaksi: buatBatalTransaksi(k),
    batalAkad: buatBatalAkad(k),
    hapusLibur: buatHapusLibur(k),
  };
}

export type LayananPembatalan = ReturnType<typeof buatLayananPembatalan>;

/**
 * Layanan dengan operasi tulis idempoten (header `Idempotency-Key`): tiap
 * operasi di bawah dijalankan sekali dalam satu transaksi dan hasilnya diputar
 * ulang untuk kunci yang sama.
 */
export function buatLayananPembatalanIdempoten(deps: PembatalanDeps) {
  return denganIdempotensi(deps.db, "pembatalan", (db) => buatLayananPembatalan({ ...deps, db }), [
    "batalTransaksi",
    "batalAkad",
    "hapusLibur",
  ]);
}
