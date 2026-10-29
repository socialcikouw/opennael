import { asc, eq } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { wilayah } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { wajibPeran } from "../../../platform/http/peran";

export function buatKueriWilayah(deps: { db: Db }) {
  return {
    /** Kampung kantor ini — pilihan formulir akad (kolektor) & salinan migrasi (bos). */
    async daftarKampung(aktor: Aktor) {
      wajibPeran(aktor, "kolektor", "bos");
      return deps.db
        .select({ id: wilayah.id, nama: wilayah.nama })
        .from(wilayah)
        .where(eq(wilayah.kantorId, aktor.kantorId))
        .orderBy(asc(wilayah.nama));
    },
  };
}
