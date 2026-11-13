import type { LokasiRumahInput } from "@opennael/contracts";
import { eq } from "drizzle-orm";
import type { Db } from "../../../../platform/db/klien";
import { nasabah } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import { dilarang } from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { catatRiwayat } from "../../../../platform/riwayat";
import { keJawaban, kunci, satu } from "../baris";

export function buatRekamLokasi(deps: { db: Db }) {
  /** Rekam titik rumah (bos / kolektor pemegang) — nilai lama tercatat di riwayat. */
  return async function rekamLokasi(aktor: Aktor, id: string, input: LokasiRumahInput) {
    wajibPeran(aktor, "bos", "kolektor");
    return deps.db.transaction(async (tx) => {
      const n = await kunci(tx, aktor, id);
      if (aktor.peran === "kolektor" && n.kolektorId !== aktor.penggunaId) {
        throw dilarang("BUKAN_PEGANGAN_ANDA", "Nasabah ini dipegang kolektor lain");
      }
      await tx
        .update(nasabah)
        .set({
          latitude: input.latitude,
          longitude: input.longitude,
          akurasiMeter: input.akurasiMeter,
        })
        .where(eq(nasabah.id, id));
      await catatRiwayat(tx, {
        kantorId: aktor.kantorId,
        tabel: "nasabah",
        barisId: id,
        aksi: "rekam_lokasi",
        sebelum: { latitude: n.latitude, longitude: n.longitude, akurasiMeter: n.akurasiMeter },
        sesudah: input,
        pelakuId: aktor.penggunaId,
      });
      return keJawaban(aktor, await satu(tx, aktor, id));
    });
  };
}
