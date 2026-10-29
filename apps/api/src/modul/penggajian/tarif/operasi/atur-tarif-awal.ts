import { sql } from "drizzle-orm";
import type { Db } from "../../../../platform/db/klien";
import { tarifGaji } from "../../../../platform/db/skema";

/** Tarif gaji kantor pertama: 5% storting (docs/skema/schema-tarif-gaji.md). */
const TARIF_AWAL_BP = 500;

/** Tarif kantor pertama, berlaku sejak hari ini kantor — dalam `tx` registrasi. */
export async function aturTarifAwal(tx: Db, kantorId: string, dibuatOleh: string) {
  await tx.insert(tarifGaji).values({
    kantorId,
    tarifBp: TARIF_AWAL_BP,
    berlakuMulai: sql`kantor_hari_ini(${kantorId})`,
    dibuatOleh,
  });
}
