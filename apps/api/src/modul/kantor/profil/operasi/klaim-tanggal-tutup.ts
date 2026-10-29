import { and, eq, isNull, lt, or } from "drizzle-orm";
import type { Db } from "../../../../platform/db/klien";
import { kantor } from "../../../../platform/db/skema";

/**
 * Mengklaim penutupan hari `tanggal` untuk satu kantor dalam `tx` pemanggil:
 * `false` bila hari itu (atau yang lebih baru) sudah ditutup. Atomik — dua
 * penyapu bersamaan, hanya satu yang berhasil.
 */
export async function klaimTanggalTutup(
  tx: Db,
  kantorId: string,
  tanggal: string,
): Promise<boolean> {
  const klaim = await tx
    .update(kantor)
    .set({ tanggalTutupTerakhir: tanggal })
    .where(
      and(
        eq(kantor.id, kantorId),
        or(isNull(kantor.tanggalTutupTerakhir), lt(kantor.tanggalTutupTerakhir, tanggal)),
      ),
    )
    .returning({ id: kantor.id });
  return klaim.length > 0;
}
