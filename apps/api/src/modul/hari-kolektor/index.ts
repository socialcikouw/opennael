import type { RuteKonteks } from "../../platform/http/router";
import type { ruteAbsensi } from "./absensi/rute";
import type { ruteRuteKolektor } from "./rute-kolektor/rute";
import type { ruteSetoranSore } from "./setoran-sore/rute";

export { catatanHari } from "./absensi/data";
export { buatLayananAbsensiIdempoten } from "./absensi/layanan";
export { ruteAbsensi } from "./absensi/rute";
export { bukaGerbang, type GerbangDeps } from "./gerbang";
export { buatLayananRute } from "./rute-kolektor/layanan";
export { ruteRuteKolektor } from "./rute-kolektor/rute";
export { kasSudahDiterima } from "./setoran-sore/kunci-hari";
export { buatLayananSetoranSoreIdempoten } from "./setoran-sore/layanan";
export { batalTransferTransaksi } from "./setoran-sore/operasi/batal-transfer-transaksi";
export { ruteSetoranSore } from "./setoran-sore/rute";

/** Tipe klien RPC (`hc`) konteks ini — bukan seluruh API (`@opennael/api/tipe/hari-kolektor`). */
export type RuteHariKolektor = RuteKonteks<
  | ReturnType<typeof ruteAbsensi>
  | ReturnType<typeof ruteRuteKolektor>
  | ReturnType<typeof ruteSetoranSore>
>;
