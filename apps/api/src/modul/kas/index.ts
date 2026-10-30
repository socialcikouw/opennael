import type { RuteKonteks } from "../../platform/http/router";
import type { ruteKas } from "./rute";

export { buatLayananKasIdempoten } from "./layanan";
export { ruteKas } from "./rute";

/** Tipe klien RPC (`hc`) konteks ini — bukan seluruh API (`@opennael/api/tipe/kas`). */
export type RuteKas = RuteKonteks<ReturnType<typeof ruteKas>>;
