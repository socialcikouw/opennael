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
