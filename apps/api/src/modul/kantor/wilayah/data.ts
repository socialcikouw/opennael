import { kunciWilayah, rapikanNamaWilayah } from "@opennael/domain";
import { and, eq } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { wilayah } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { tidakDitemukan } from "../../../platform/http/galat";

export async function pastikanWilayah(
  tx: Db,
  aktor: Aktor,
  kampung: { wilayahId: string } | { nama: string },
): Promise<string> {
  if ("wilayahId" in kampung) {
    const [w] = await tx
      .select({ id: wilayah.id })
      .from(wilayah)
      .where(and(eq(wilayah.id, kampung.wilayahId), eq(wilayah.kantorId, aktor.kantorId)))
      .limit(1);
    if (!w) throw tidakDitemukan("KAMPUNG_TIDAK_DITEMUKAN", "Kampung tidak ditemukan");
    return w.id;
  }
  const nama = rapikanNamaWilayah(kampung.nama);
  await tx
    .insert(wilayah)
    .values({ kantorId: aktor.kantorId, nama, dibuatOleh: aktor.penggunaId })
    .onConflictDoNothing({ target: [wilayah.kantorId, wilayah.kunci] });
  const [w] = await tx
    .select({ id: wilayah.id })
    .from(wilayah)
    .where(and(eq(wilayah.kantorId, aktor.kantorId), eq(wilayah.kunci, kunciWilayah(nama))))
    .limit(1);
  if (!w) throw new Error("gagal memastikan kampung");
  return w.id;
}
