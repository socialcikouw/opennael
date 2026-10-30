import type { RuteKonteks } from "../../platform/http/router";
import type { ruteAuth } from "./auth/rute";
import type { rutePengguna } from "./pengguna/rute";
import type { rutePerangkat } from "./perangkat/rute";
import type { ruteTautan } from "./tautan/rute";

export { buatLayananAuth, type LayananAuth } from "./auth/layanan";
export { ruteAuth } from "./auth/rute";
export { buatLayananPengguna } from "./pengguna/layanan";
export { rutePengguna } from "./pengguna/rute";
export { buatLayananPerangkat } from "./perangkat/layanan";
export { rutePerangkat } from "./perangkat/rute";
export { buatLayananTautan } from "./tautan/layanan";
export { ruteTautan } from "./tautan/rute";

/** Tipe klien RPC (`hc`) konteks ini — bukan seluruh API (`@opennael/api/tipe/identitas`). */
export type RuteIdentitas = RuteKonteks<
  | ReturnType<typeof ruteAuth>
  | ReturnType<typeof rutePengguna>
  | ReturnType<typeof rutePerangkat>
  | ReturnType<typeof ruteTautan>
>;
