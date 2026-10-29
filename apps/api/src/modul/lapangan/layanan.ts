import type { LapanganDeps } from "./data";
import { buatKueriLapangan } from "./kueri";
import { buatAbsen } from "./operasi/absen";
import { buatAkad } from "./operasi/akad";
import { buatBayar } from "./operasi/bayar";
import { buatBukaLaporan } from "./operasi/buka-laporan";
import { buatGulung } from "./operasi/gulung";
import { buatLibur } from "./operasi/libur";
import { buatLunas } from "./operasi/lunas";

export type { LapanganDeps } from "./data";
export {
  daftarkanNasabahBaru,
  keKartu,
  kolomKartu,
  kolomRem,
  pastikanWilayah,
  pinjamanKeBerikut,
} from "./data";
export function buatLayananLapangan(deps: LapanganDeps) {
  return {
    ...buatKueriLapangan(deps),
    absen: buatAbsen(deps),
    bukaLaporan: buatBukaLaporan(deps),
    akad: buatAkad(deps),
    bayar: buatBayar(deps),
    lunas: buatLunas(deps),
    gulung: buatGulung(deps),
    libur: buatLibur(deps),
  };
}
export type LayananLapangan = ReturnType<typeof buatLayananLapangan>;
