import type { GerbangDeps } from "../../hari-kolektor";
import { buatAkad } from "./operasi/akad";
import { buatGulung } from "./operasi/gulung";

/** AKAD — akad pinjaman baru (orang baru / pinjam lagi) dan gulung (A, E). */
export function buatLayananAkad(deps: GerbangDeps) {
  return {
    akad: buatAkad(deps),
    gulung: buatGulung(deps),
  };
}
export type LayananAkad = ReturnType<typeof buatLayananAkad>;
