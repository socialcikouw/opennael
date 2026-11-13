import type { Db } from "../../../platform/db/klien";
import { bacaKalender } from "../../kantor";
import type { Konteks } from "./data";
import { buatKueriRingkasan } from "./kueri";

/**
 * RINGKASAN — angka satu rentang tanggal (penagihan, akad, kas lapangan),
 * per kolektor, dan deret performa penagihan harian (aturan-usaha N). Semua
 * dari catatan berlaku. Bos & pengawas: semua kolektor; kolektor: dirinya.
 */
export interface RingkasanDeps {
  db: Db;
  sekarang?: () => Date;
}

export function buatLayananRingkasan(deps: RingkasanDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const k: Konteks = {
    db: deps.db,
    hariIni: async (aktor) => (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal,
  };
  return buatKueriRingkasan(k);
}

export type LayananRingkasan = ReturnType<typeof buatLayananRingkasan>;
