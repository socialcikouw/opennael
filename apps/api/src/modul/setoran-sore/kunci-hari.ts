import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "../../platform/db/klien";
import { hariKolektor, serahTerimaKas } from "../../platform/db/skema";

/**
 * Hari kolektor itu sudah punya serah terima berlaku? (aturan-usaha I4: hari
 * terkunci). Mengunci baris harinya bila diminta — `share` untuk pencatat
 * transfer/biaya/pembatalan, `update` untuk penerima kas — supaya kiriman
 * bersamaan berurutan. Dipakai setoran sore & pembatalan bos.
 */
export async function kasSudahDiterima(
  tx: Db,
  kolektorId: string,
  tanggal: string,
  kunci?: "update" | "share",
): Promise<boolean> {
  const pilih = tx
    .select({ id: hariKolektor.id })
    .from(hariKolektor)
    .where(and(eq(hariKolektor.kolektorId, kolektorId), eq(hariKolektor.tanggal, tanggal)));
  const [hari] = kunci ? await pilih.for(kunci) : await pilih;
  if (!hari) return false;
  const [st] = await tx
    .select({ id: serahTerimaKas.id })
    .from(serahTerimaKas)
    .where(and(eq(serahTerimaKas.hariKolektorId, hari.id), isNull(serahTerimaKas.dibatalkanAt)))
    .limit(1);
  return Boolean(st);
}
