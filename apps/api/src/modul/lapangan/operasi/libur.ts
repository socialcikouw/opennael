import { angsuranKe, tolakLibur } from "@opennael/domain";
import { liburNasabah } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { melanggar } from "../../../platform/http/galat";
import { kunciPinjaman, type LapanganDeps, pastikanBelumAdaPeristiwa } from "../data";
import { bukaGerbang, VALIDASI_PENUH } from "../gerbang";
export function buatLibur(deps: LapanganDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const validasi = deps.validasiKalender ?? VALIDASI_PENUH;
  return async function libur(
    aktor: Aktor,
    input: { pinjamanId: string; alasan?: string | undefined },
  ) {
    return deps.db.transaction(async (tx) => {
      const { tanggal } = await bukaGerbang(tx, aktor, sekarang(), {
        perluAbsen: true,
        validasi,
      });
      const p = await kunciPinjaman(tx, aktor, input.pinjamanId);
      await pastikanBelumAdaPeristiwa(tx, p.id, tanggal);
      // G1–G3 — aturan yang sama dengan tombol Libur di HP.
      const tolak = tolakLibur({ ...p, angsuranKe: angsuranKe(p) }, tanggal);
      if (tolak) throw melanggar(tolak.kode, tolak.pesan);
      const [l] = await tx
        .insert(liburNasabah)
        .values({
          kantorId: aktor.kantorId,
          pencatatId: aktor.penggunaId,
          pinjamanId: p.id,
          tanggal,
          alasanLibur: input.alasan ?? null,
        })
        .returning({
          id: liburNasabah.id,
          pinjamanId: liburNasabah.pinjamanId,
          tanggal: liburNasabah.tanggal,
          alasanLibur: liburNasabah.alasanLibur,
        });
      if (!l) throw new Error("gagal mencatat libur");
      return l;
    });
  };
}
