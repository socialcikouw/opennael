import type { MutasiInput } from "@opennael/contracts";
import { syaratAkunMutasi } from "@opennael/domain";
import { mutasiKasKantor } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { wajibPeran } from "../../../platform/http/peran";
import { type Konteks, keMutasi, wajibBuku } from "../data";

export function buatCatatMutasi(k: Konteks) {
  /** Catat mutasi (bos) — hari ini; akun mengikuti arah jenisnya. */
  return async function catatMutasi(aktor: Aktor, input: MutasiInput) {
    wajibPeran(aktor, "bos");
    const akun = syaratAkunMutasi(input);
    await wajibBuku(k.db, aktor.kantorId);
    const [m] = await k.db
      .insert(mutasiKasKantor)
      .values({
        kantorId: aktor.kantorId,
        tanggal: await k.hariIni(aktor),
        jenis: input.jenis,
        ...akun,
        nominal: input.nominal,
        keterangan: input.keterangan,
        dibuatOleh: aktor.penggunaId,
      })
      .returning();
    if (!m) throw new Error("mutasi tak tersimpan");
    return keMutasi(m);
  };
}
