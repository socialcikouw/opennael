import type { BatalInput } from "@opennael/contracts";
import { and, eq } from "drizzle-orm";
import { hariKolektor, serahTerimaKas } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import {
  batalHanyaHariIni,
  sudahDibatalkan,
  tidakDitemukan,
} from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { type Konteks, satuHari } from "../data";

export function buatBatalSerahTerima(k: Konteks) {
  /** Batal penerimaan kas (bos, hari yang sama) — hari kolektor terbuka lagi. */
  return async function batalSerahTerima(aktor: Aktor, id: string, input: BatalInput) {
    wajibPeran(aktor, "bos");
    const tanggalIni = await k.hariIni(aktor);
    return k.db.transaction(async (tx) => {
      const [st] = await tx
        .select({
          dibatalkanAt: serahTerimaKas.dibatalkanAt,
          kolektorId: hariKolektor.kolektorId,
          tanggal: hariKolektor.tanggal,
        })
        .from(serahTerimaKas)
        .innerJoin(hariKolektor, eq(hariKolektor.id, serahTerimaKas.hariKolektorId))
        .where(and(eq(serahTerimaKas.id, id), eq(serahTerimaKas.kantorId, aktor.kantorId)))
        .for("update", { of: serahTerimaKas });
      if (!st) throw tidakDitemukan("SERAH_TERIMA_TIDAK_DITEMUKAN", "Serah terima tidak ditemukan");
      if (st.dibatalkanAt) throw sudahDibatalkan();
      if (st.tanggal !== tanggalIni) throw batalHanyaHariIni();
      await tx
        .update(serahTerimaKas)
        .set({
          dibatalkanAt: k.sekarang(),
          dibatalkanOleh: aktor.penggunaId,
          alasanBatal: input.alasan,
        })
        .where(eq(serahTerimaKas.id, id));
      return satuHari(tx, aktor, st.kolektorId, st.tanggal);
    });
  };
}
