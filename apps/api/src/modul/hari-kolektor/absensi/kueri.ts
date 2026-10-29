import type { Aktor } from "../../../platform/http/aktor";
import { wajibPeran } from "../../../platform/http/peran";
import { bacaKalender, kalenderGerbang, VALIDASI_PENUH } from "../../kantor";
import type { GerbangDeps } from "../gerbang";
import { hariIni } from "./data";

export function buatKueriAbsensi(deps: GerbangDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const validasi = deps.validasiKalender ?? VALIDASI_PENUH;
  return {
    /** Keadaan hari ini kolektor (null = belum absen); kalender seperti dilihat gerbang. */
    async keadaanHariIni(aktor: Aktor) {
      wajibPeran(aktor, "kolektor");
      const kal = kalenderGerbang(
        await bacaKalender(deps.db, aktor.kantorId, sekarang()),
        validasi,
      );
      return { kalender: kal, hari: await hariIni(deps.db, aktor, kal.tanggal) };
    },
  };
}
