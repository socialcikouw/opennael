import type { Db } from "./db/klien";
import { riwayatPerubahan, type tabelBerjejakEnum } from "./db/skema";

/**
 * Tulis satu jejak di `riwayat_perubahan` — di transaksi database yang SAMA
 * dengan perubahannya. Hanya untuk data yang ditimpa atau dihapus; tabel
 * uang yang hanya bertambah tidak ditulis ke sini.
 */
export async function catatRiwayat(
  db: Db,
  jejak: {
    kantorId: string;
    tabel: (typeof tabelBerjejakEnum.enumValues)[number];
    barisId: string;
    aksi: string;
    sebelum?: Record<string, unknown> | null;
    sesudah?: Record<string, unknown> | null;
    alasan?: string | null;
    pelakuId: string;
  },
): Promise<void> {
  await db.insert(riwayatPerubahan).values({
    kantorId: jejak.kantorId,
    tabel: jejak.tabel,
    barisId: jejak.barisId,
    aksi: jejak.aksi,
    sebelum: jejak.sebelum ?? null,
    sesudah: jejak.sesudah ?? null,
    alasanPerubahan: jejak.alasan ?? null,
    pelakuId: jejak.pelakuId,
  });
}
