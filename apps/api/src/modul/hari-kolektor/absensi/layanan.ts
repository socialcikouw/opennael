import { denganIdempotensi } from "../../../platform/idempotensi";
import type { GerbangDeps } from "../gerbang";
import { buatKueriAbsensi } from "./kueri";
import { buatAbsen } from "./operasi/absen";
import { buatBukaLaporan } from "./operasi/buka-laporan";

/** ABSENSI KOLEKTOR — absen pagi, keadaan hari ini, buka laporan (akhir kerja lapangan). */
export function buatLayananAbsensi(deps: GerbangDeps) {
  return {
    ...buatKueriAbsensi(deps),
    absen: buatAbsen(deps),
    bukaLaporan: buatBukaLaporan(deps),
  };
}
export type LayananAbsensi = ReturnType<typeof buatLayananAbsensi>;

/**
 * Layanan dengan operasi tulis idempoten (header `Idempotency-Key`): tiap
 * operasi di bawah dijalankan sekali dalam satu transaksi dan hasilnya diputar
 * ulang untuk kunci yang sama.
 * Nama operasi tersimpan tetap "lapangan/<metode>" (kunci yang beredar tetap berlaku).
 */
export function buatLayananAbsensiIdempoten(deps: GerbangDeps) {
  return denganIdempotensi(deps.db, "lapangan", (db) => buatLayananAbsensi({ ...deps, db }), [
    "absen",
    "bukaLaporan",
  ]);
}
