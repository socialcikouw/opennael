import type { RuteKonteks } from "../../platform/http/router";
import type { ruteMigrasi } from "./rute";

export { buatLayananMigrasiIdempoten } from "./layanan";
export { ruteMigrasi } from "./rute";

/** Tipe klien RPC (`hc`) konteks ini — bukan seluruh API (`@opennael/api/tipe/migrasi`). */
export type RuteMigrasi = RuteKonteks<ReturnType<typeof ruteMigrasi>>;
