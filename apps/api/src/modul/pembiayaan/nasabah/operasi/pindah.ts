import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "../../../../platform/db/klien";
import { nasabah, pengguna, pinjaman } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import { melanggar, tidakDitemukan } from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { catatRiwayat } from "../../../../platform/riwayat";
import { keJawaban, kunci, satu } from "../baris";

export function buatPindahNasabah(deps: { db: Db }) {
  /** Pindah pemegang (bos) — pinjaman aktif dikunci supaya tak berbalapan dengan setoran. */
  return async function pindah(aktor: Aktor, id: string, input: { kolektorId: string }) {
    wajibPeran(aktor, "bos");
    return deps.db.transaction(async (tx) => {
      const n = await kunci(tx, aktor, id);
      await tx
        .select({ id: pinjaman.id })
        .from(pinjaman)
        .where(and(eq(pinjaman.nasabahId, id), inArray(pinjaman.status, ["berjalan", "macet"])))
        .for("update");
      const [k] = await tx
        .select({ dinonaktifkanAt: pengguna.dinonaktifkanAt })
        .from(pengguna)
        .where(
          and(eq(pengguna.id, input.kolektorId), eq(pengguna.kolektorKantorId, aktor.kantorId)),
        );
      if (!k) throw tidakDitemukan("KOLEKTOR_TIDAK_DITEMUKAN", "Kolektor tidak ditemukan");
      if (k.dinonaktifkanAt) throw melanggar("KOLEKTOR_NONAKTIF", "Kolektor tujuan nonaktif");
      if (n.kolektorId === input.kolektorId) {
        throw melanggar("TIDAK_ADA_PERUBAHAN", "Nasabah sudah dipegang kolektor ini");
      }
      await tx.update(nasabah).set({ kolektorId: input.kolektorId }).where(eq(nasabah.id, id));
      await catatRiwayat(tx, {
        kantorId: aktor.kantorId,
        tabel: "nasabah",
        barisId: id,
        aksi: "pindah_pemegang",
        sebelum: { kolektorId: n.kolektorId },
        sesudah: { kolektorId: input.kolektorId },
        pelakuId: aktor.penggunaId,
      });
      return keJawaban(aktor, await satu(tx, aktor, id));
    });
  };
}
