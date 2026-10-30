import type { RuteKonteks } from "../../platform/http/router";
import type { ruteKalender } from "./kalender/rute";
import type { ruteKebijakan } from "./kebijakan/rute";
import type { ruteProfil } from "./profil/rute";
import type { ruteWilayah } from "./wilayah/rute";

export {
  bacaKalender,
  hariTagihAntara,
  type KalenderHari,
  kalenderGerbang,
  VALIDASI_PENUH,
  type ValidasiKalender,
} from "./kalender/kalender";
export { buatLayananKalender } from "./kalender/layanan";
export { ruteKalender } from "./kalender/rute";
export { kolomRem, remBerlaku } from "./kebijakan/data";
export { buatLayananKebijakan } from "./kebijakan/layanan";
export { ruteKebijakan } from "./kebijakan/rute";
export { buatLayananProfil } from "./profil/layanan";
export { aturPekanKerjaAwal, bukaKantor } from "./profil/operasi/buka-kantor";
export { klaimTanggalTutup } from "./profil/operasi/klaim-tanggal-tutup";
export { ruteProfil } from "./profil/rute";
export { pastikanWilayah } from "./wilayah/data";
export { buatLayananWilayah } from "./wilayah/layanan";
export { ruteWilayah } from "./wilayah/rute";

/** Tipe klien RPC (`hc`) konteks ini — bukan seluruh API (`@opennael/api/tipe/kantor`). */
export type RuteKantor = RuteKonteks<
  | ReturnType<typeof ruteKalender>
  | ReturnType<typeof ruteKebijakan>
  | ReturnType<typeof ruteProfil>
  | ReturnType<typeof ruteWilayah>
>;
