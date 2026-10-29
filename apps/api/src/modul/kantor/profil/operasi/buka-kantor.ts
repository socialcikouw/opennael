import { sql } from "drizzle-orm";
import type { Db } from "../../../../platform/db/klien";
import { kantor, pekanKerja } from "../../../../platform/db/skema";

/** Pekan kerja pertama setiap kantor: Senin–Sabtu. */
const HARI_KERJA_AWAL = 126;

/**
 * Membuka kantor baru dalam `tx` pemanggil (registrasi, bersama akun bos dan
 * tarif awal). Pekan kerja pertama menyusul lewat `aturPekanKerjaAwal`, karena
 * mencatat siapa pembuatnya (bos) yang baru ada sesudah kantor.
 */
export async function bukaKantor(
  tx: Db,
  input: Pick<typeof kantor.$inferInsert, "nama" | "zonaWaktu">,
): Promise<{ id: string }> {
  const [k] = await tx.insert(kantor).values(input).returning({ id: kantor.id });
  if (!k) throw new Error("gagal membuat kantor");
  return k;
}

/** Pekan kerja pertama kantor baru, berlaku sejak hari ini kantor. */
export async function aturPekanKerjaAwal(tx: Db, kantorId: string, dibuatOleh: string) {
  await tx.insert(pekanKerja).values({
    kantorId,
    berlakuMulai: sql`kantor_hari_ini(${kantorId})`,
    hariKerja: HARI_KERJA_AWAL,
    dibuatOleh,
  });
}
