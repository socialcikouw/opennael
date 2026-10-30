import type { RuteKonteks } from "../../platform/http/router";
import type { ruteAkad } from "./akad/rute";
import type { ruteFoto } from "./foto/rute";
import type { ruteNasabah } from "./nasabah/rute";
import type { rutePembatalan } from "./pembatalan/rute";
import type { rutePemutihan } from "./pemutihan/rute";
import type { rutePeristiwa } from "./peristiwa/rute";
import type { rutePinjaman } from "./pinjaman/rute";
import type { ruteTabungan } from "./tabungan/rute";

export { buatLayananAkadIdempoten } from "./akad/layanan";
export { ruteAkad } from "./akad/rute";
export { buatLayananFoto } from "./foto/layanan";
export { ruteFoto } from "./foto/rute";
export { daftarkanNasabahBaru } from "./nasabah/data";
export { buatLayananNasabah } from "./nasabah/layanan";
export { ruteNasabah } from "./nasabah/rute";
export { buatLayananPembatalanIdempoten } from "./pembatalan/layanan";
export { rutePembatalan } from "./pembatalan/rute";
export { buatLayananPemutihan } from "./pemutihan/layanan";
export { rutePemutihan } from "./pemutihan/rute";
export { buatLayananPeristiwaIdempoten } from "./peristiwa/layanan";
export { rutePeristiwa } from "./peristiwa/rute";
export { pinjamanKeBerikut } from "./pinjaman/data";
export { buatLayananPinjaman } from "./pinjaman/layanan";
export { salinPinjaman } from "./pinjaman/operasi/salin-pinjaman";
export { rutePinjaman } from "./pinjaman/rute";
export { buatLayananTabunganIdempoten } from "./tabungan/layanan";
export { ruteTabungan } from "./tabungan/rute";
export { buatLayananTutupHari, type LayananTutupHari } from "./tutup-hari/layanan";

/** Tipe klien RPC (`hc`) konteks ini — bukan seluruh API (`@opennael/api/tipe/pembiayaan`). */
export type RutePembiayaan = RuteKonteks<
  | ReturnType<typeof ruteAkad>
  | ReturnType<typeof ruteFoto>
  | ReturnType<typeof ruteNasabah>
  | ReturnType<typeof rutePembatalan>
  | ReturnType<typeof rutePemutihan>
  | ReturnType<typeof rutePeristiwa>
  | ReturnType<typeof rutePinjaman>
  | ReturnType<typeof ruteTabungan>
>;
