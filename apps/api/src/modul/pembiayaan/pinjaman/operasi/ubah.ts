import { and, eq } from "drizzle-orm";
import { pinjaman } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import { melanggar, tidakDitemukan } from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { catatRiwayat } from "../../../../platform/riwayat";
import type { Konteks } from "../baris";
import { rincian } from "../rincian";

export function buatUbahPinjaman(k: Konteks) {
  /** Sunting nomor urut pinjaman (bos) — tercatat di riwayat. */
  return async function ubah(aktor: Aktor, id: string, input: { pinjamanKe: number }) {
    wajibPeran(aktor, "bos");
    return k.db.transaction(async (tx) => {
      const [p] = await tx
        .select({ pinjamanKe: pinjaman.pinjamanKe, status: pinjaman.status })
        .from(pinjaman)
        .where(and(eq(pinjaman.id, id), eq(pinjaman.kantorId, aktor.kantorId)))
        .for("update");
      if (!p) throw tidakDitemukan("PINJAMAN_TIDAK_DITEMUKAN", "Pinjaman tidak ditemukan");
      if (p.status === "batal") {
        throw melanggar("PINJAMAN_BATAL", "Pinjaman yang dibatalkan tidak bisa disunting");
      }
      if (p.pinjamanKe === input.pinjamanKe) {
        throw melanggar("TIDAK_ADA_PERUBAHAN", "Nomor pinjaman sudah sama");
      }
      await tx.update(pinjaman).set({ pinjamanKe: input.pinjamanKe }).where(eq(pinjaman.id, id));
      await catatRiwayat(tx, {
        kantorId: aktor.kantorId,
        tabel: "pinjaman",
        barisId: id,
        aksi: "ubah_pinjaman_ke",
        sebelum: { pinjamanKe: p.pinjamanKe },
        sesudah: { pinjamanKe: input.pinjamanKe },
        pelakuId: aktor.penggunaId,
      });
      return rincian(k, tx, aktor, id);
    });
  };
}
