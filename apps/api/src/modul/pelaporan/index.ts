import type { RuteKonteks } from "../../platform/http/router";
import type { ruteAktivitas } from "./aktivitas/rute";
import type { ruteRingkasan } from "./ringkasan/rute";

export { buatLayananAktivitas } from "./aktivitas/layanan";
export { ruteAktivitas } from "./aktivitas/rute";
export { buatLayananRingkasan } from "./ringkasan/layanan";
export { ruteRingkasan } from "./ringkasan/rute";

/** Tipe klien RPC (`hc`) konteks ini — bukan seluruh API (`@opennael/api/tipe/pelaporan`). */
export type RutePelaporan = RuteKonteks<
  ReturnType<typeof ruteAktivitas> | ReturnType<typeof ruteRingkasan>
>;
