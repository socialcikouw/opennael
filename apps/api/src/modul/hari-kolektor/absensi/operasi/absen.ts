import type { AbsenInput } from "@opennael/contracts";
import { hariKolektor } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import { VALIDASI_PENUH } from "../../../kantor";
import { bukaGerbang, type GerbangDeps } from "../../gerbang";
import { hariIni } from "../data";
export function buatAbsen(deps: GerbangDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const validasi = deps.validasiKalender ?? VALIDASI_PENUH;
  return async function absen(aktor: Aktor, input: AbsenInput) {
    const { tanggal } = await bukaGerbang(deps.db, aktor, sekarang(), {
      perluAbsen: false,
      validasi,
    });
    // Transaksi sendiri: absen ganda ditolak UNIQUE tanpa merusak transaksi pemanggil.
    await deps.db.transaction(async (tx) => {
      await tx.insert(hariKolektor).values({
        kantorId: aktor.kantorId,
        kolektorId: aktor.penggunaId,
        tanggal,
        absensi: input.absensi,
        ...(input.absensi === "masuk_kerja"
          ? { kasLapangan: input.kasLapangan, uangJalan: input.uangJalan }
          : { alasanTidakKerja: input.alasan }),
      });
    });
    const h = await hariIni(deps.db, aktor, tanggal);
    if (!h) throw new Error("absen tak tersimpan");
    return h;
  };
}
