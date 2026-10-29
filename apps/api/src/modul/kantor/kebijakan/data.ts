import { gabungRem } from "@opennael/domain";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { kebijakan } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";

export const kolomRem = {
  kolektorId: kebijakan.kolektorId,
  nasabahId: kebijakan.nasabahId,
  pinjamanBaru: kebijakan.pinjamanBaruDikunci,
  naik: kebijakan.naikPinjamanDikunci,
  gulung: kebijakan.gulungPinjamanDikunci,
  alasan: kebijakan.alasanKunci,
};

export async function remBerlaku(db: Db, aktor: Aktor, nasabahId: string | null) {
  const baris = await db
    .select(kolomRem)
    .from(kebijakan)
    .where(
      and(
        eq(kebijakan.kantorId, aktor.kantorId),
        or(
          and(isNull(kebijakan.kolektorId), isNull(kebijakan.nasabahId)),
          eq(kebijakan.kolektorId, aktor.penggunaId),
          nasabahId ? eq(kebijakan.nasabahId, nasabahId) : sql`false`,
        ),
      ),
    );
  return gabungRem(baris, { kolektorId: aktor.penggunaId, nasabahId });
}
