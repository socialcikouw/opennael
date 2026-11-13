import type { BatalInput } from "@opennael/contracts";
import { and, eq } from "drizzle-orm";
import { liburNasabah } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import { batalHanyaHariIni, tidakDitemukan } from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { catatRiwayat } from "../../../../platform/riwayat";
import type { Konteks } from "../data";

export function buatHapusLibur(k: Konteks) {
  /**
   * Hapus tanda libur salah (bos, hari yang sama). Libur bukan uang: baris
   * dihapus dan isinya + alasan dicatat di riwayat — sesudahnya kolektor
   * bisa mencatat setoran pinjaman itu hari ini.
   */
  return async function hapusLibur(aktor: Aktor, id: string, input: BatalInput) {
    wajibPeran(aktor, "bos");
    const tanggalIni = await k.hariIni(aktor);
    return k.db.transaction(async (tx) => {
      const [l] = await tx
        .select({
          id: liburNasabah.id,
          pinjamanId: liburNasabah.pinjamanId,
          pencatatId: liburNasabah.pencatatId,
          tanggal: liburNasabah.tanggal,
          alasanLibur: liburNasabah.alasanLibur,
        })
        .from(liburNasabah)
        .where(and(eq(liburNasabah.id, id), eq(liburNasabah.kantorId, aktor.kantorId)))
        .for("update");
      if (!l) throw tidakDitemukan("LIBUR_TIDAK_DITEMUKAN", "Tanda libur tidak ditemukan");
      if (l.tanggal !== tanggalIni) throw batalHanyaHariIni();
      await tx.delete(liburNasabah).where(eq(liburNasabah.id, l.id));
      await catatRiwayat(tx, {
        kantorId: aktor.kantorId,
        tabel: "libur_nasabah",
        barisId: l.id,
        aksi: "hapus_libur",
        sebelum: l,
        alasan: input.alasan,
        pelakuId: aktor.penggunaId,
      });
      const { pencatatId: _, ...libur } = l;
      return libur;
    });
  };
}
