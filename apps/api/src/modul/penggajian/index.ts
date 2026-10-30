import type { RuteKonteks } from "../../platform/http/router";
import type { ruteGaji } from "./gaji/rute";
import type { ruteTarif } from "./tarif/rute";

export { buatLayananGajiIdempoten } from "./gaji/layanan";
export { ruteGaji } from "./gaji/rute";
export { buatLayananTarif } from "./tarif/layanan";
export { aturTarifAwal } from "./tarif/operasi/atur-tarif-awal";
export { ruteTarif } from "./tarif/rute";

/** Tipe klien RPC (`hc`) konteks ini — bukan seluruh API (`@opennael/api/tipe/penggajian`). */
export type RutePenggajian = RuteKonteks<
  ReturnType<typeof ruteGaji> | ReturnType<typeof ruteTarif>
>;
