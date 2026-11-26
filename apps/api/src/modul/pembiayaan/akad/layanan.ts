import { denganIdempotensi } from "../../../platform/idempotensi";
import type { GerbangDeps } from "../../hari-kolektor";
import { buatAkad } from "./operasi/akad";
import { buatGulung } from "./operasi/gulung";

/** AKAD — akad pinjaman baru (orang baru / pinjam lagi) dan gulung (A, E). */
export function buatLayananAkad(deps: GerbangDeps) {
  const { akad, periksa } = buatAkad(deps);
  return {
    akad,
    /** Pemeriksaan sebelum foto serah terima — tak menulis apa pun, jadi tak idempoten. */
    periksaAkad: periksa,
    gulung: buatGulung(deps),
  };
}
export type LayananAkad = ReturnType<typeof buatLayananAkad>;

/**
 * Layanan dengan operasi tulis idempoten (header `Idempotency-Key`): tiap
 * operasi di bawah dijalankan sekali dalam satu transaksi dan hasilnya diputar
 * ulang untuk kunci yang sama.
 * Nama operasi tersimpan tetap "lapangan/<metode>" (kunci yang beredar tetap berlaku).
 */
export function buatLayananAkadIdempoten(deps: GerbangDeps) {
  return denganIdempotensi(deps.db, "lapangan", (db) => buatLayananAkad({ ...deps, db }), [
    "akad",
    "gulung",
  ]);
}
