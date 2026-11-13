import type { BatalInput } from "@opennael/contracts";
import { and, eq } from "drizzle-orm";
import { mutasiKasKantor } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { batalHanyaHariIni, sudahDibatalkan, tidakDitemukan } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { type Konteks, keMutasi } from "../data";

export function buatBatalMutasi(k: Konteks) {
  /** Batal mutasi (bos) — hari yang sama. */
  return async function batalMutasi(aktor: Aktor, id: string, input: BatalInput) {
    wajibPeran(aktor, "bos");
    const tanggal = await k.hariIni(aktor);
    return k.db.transaction(async (tx) => {
      const [m] = await tx
        .select()
        .from(mutasiKasKantor)
        .where(and(eq(mutasiKasKantor.id, id), eq(mutasiKasKantor.kantorId, aktor.kantorId)))
        .for("update");
      if (!m) throw tidakDitemukan("MUTASI_TIDAK_DITEMUKAN", "Mutasi tidak ditemukan");
      if (m.dibatalkanAt) throw sudahDibatalkan();
      if (m.tanggal !== tanggal) throw batalHanyaHariIni();
      const [baru] = await tx
        .update(mutasiKasKantor)
        .set({
          dibatalkanAt: k.sekarang(),
          dibatalkanOleh: aktor.penggunaId,
          alasanBatal: input.alasan,
        })
        .where(eq(mutasiKasKantor.id, id))
        .returning();
      if (!baru) throw new Error("mutasi hilang");
      return keMutasi(baru);
    });
  };
}
