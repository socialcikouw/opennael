import type { syaratMigrasi } from "@opennael/domain";
import { eq, sql } from "drizzle-orm";
import type { Db } from "../../../../platform/db/klien";
import { nasabah, pinjaman } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";

/**
 * Menyalin satu pinjaman yang masih berjalan dari buku lama (aturan-usaha A10)
 * dalam `tx` pemanggil: tanpa uang keluar, saldo awal = sisa di buku, tabungan
 * pembuka masuk tabungan nasabah. Syarat sudah dihitung `syaratMigrasi`.
 */
export async function salinPinjaman(
  tx: Db,
  aktor: Aktor,
  p: {
    kolektorId: string;
    nasabahId: string;
    pinjamanKe: number;
    syarat: ReturnType<typeof syaratMigrasi>;
    tanggalAkad: string;
    tanggalDisalin: string;
    macet: boolean;
  },
): Promise<{ id: string; namaNasabah: string; status: "macet" | "berjalan" }> {
  const status = p.macet ? ("macet" as const) : ("berjalan" as const);
  const { syarat } = p;
  const [baru] = await tx
    .insert(pinjaman)
    .values({
      kantorId: aktor.kantorId,
      pencairId: p.kolektorId,
      dibuatOleh: aktor.penggunaId,
      nasabahId: p.nasabahId,
      pinjamanKe: p.pinjamanKe,
      jenis: syarat.jenis,
      tenor: syarat.tenor,
      asal: "migrasi",
      tanggalAkad: p.tanggalAkad,
      tanggalDisalin: p.tanggalDisalin,
      tanggalMacet: p.macet ? p.tanggalDisalin : null,
      pokok: syarat.pokok,
      potonganAdmin: 0,
      tabunganMasuk: syarat.tabunganMasuk,
      pencairan: 0,
      totalKembali: syarat.totalKembali,
      angsuran: syarat.angsuran,
      saldoAwal: syarat.saldoAwal,
      dropBaru: 0,
      saldo: syarat.saldoAwal,
      status,
    })
    .returning({ id: pinjaman.id });
  if (!baru) throw new Error("gagal menyalin pinjaman");
  const [n] = await tx
    .update(nasabah)
    .set({ saldoTabungan: sql`${nasabah.saldoTabungan} + ${syarat.tabunganMasuk}` })
    .where(eq(nasabah.id, p.nasabahId))
    .returning({ nama: nasabah.nama });
  return { id: baru.id, namaNasabah: n?.nama ?? "", status };
}
