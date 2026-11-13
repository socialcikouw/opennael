import type { BatalInput } from "@opennael/contracts";
import { and, eq } from "drizzle-orm";
import { pencocokanKas } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { batalHanyaHariIni, sudahDibatalkan, tidakDitemukan } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { type Konteks, kePencocokan, pilihPencocokan } from "../data";

export function buatBatalPencocokan(k: Konteks) {
  /** Batal pencocokan (bos) — salah hitung, hari yang sama. */
  return async function batalPencocokan(aktor: Aktor, id: string, input: BatalInput) {
    wajibPeran(aktor, "bos");
    const tanggal = await k.hariIni(aktor);
    return k.db.transaction(async (tx) => {
      const [p] = await tx
        .select({ tanggal: pencocokanKas.tanggal, dibatalkanAt: pencocokanKas.dibatalkanAt })
        .from(pencocokanKas)
        .where(and(eq(pencocokanKas.id, id), eq(pencocokanKas.kantorId, aktor.kantorId)))
        .for("update");
      if (!p) throw tidakDitemukan("PENCOCOKAN_TIDAK_DITEMUKAN", "Pencocokan tidak ditemukan");
      if (p.dibatalkanAt) throw sudahDibatalkan();
      if (p.tanggal !== tanggal) throw batalHanyaHariIni();
      await tx
        .update(pencocokanKas)
        .set({
          dibatalkanAt: k.sekarang(),
          dibatalkanOleh: aktor.penggunaId,
          alasanBatal: input.alasan,
        })
        .where(eq(pencocokanKas.id, id));
      const [hasil] = await pilihPencocokan(tx).where(eq(pencocokanKas.id, id));
      if (!hasil) throw new Error("pencocokan hilang");
      return kePencocokan(hasil);
    });
  };
}
