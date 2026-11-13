import type { UbahNasabahInput } from "@opennael/contracts";
import { samarkanNik } from "@opennael/domain";
import { eq } from "drizzle-orm";
import type { Db } from "../../../../platform/db/klien";
import { nasabah } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import { wajibPeran } from "../../../../platform/http/peran";
import { catatRiwayat } from "../../../../platform/riwayat";
import { pastikanWilayah } from "../../../kantor";
import { keJawaban, kunci, satu } from "../baris";

export function buatUbahNasabah(deps: { db: Db }) {
  /** Sunting identitas (bos) — kolom yang berubah tercatat di riwayat. */
  return async function ubah(aktor: Aktor, id: string, input: UbahNasabahInput) {
    wajibPeran(aktor, "bos");
    return deps.db.transaction(async (tx) => {
      const n = await kunci(tx, aktor, id);
      const baru = {
        nama: input.nama,
        wilayahId: input.kampung ? await pastikanWilayah(tx, aktor, input.kampung) : undefined,
        nomorHp: input.nomorHp,
        nik: input.nik,
      };
      const sebelum: Record<string, unknown> = {};
      const sesudah: Record<string, unknown> = {};
      for (const k of ["nama", "wilayahId", "nomorHp", "nik"] as const) {
        if (baru[k] !== undefined && baru[k] !== n[k]) {
          // NIK di jejak disimpan tersamar.
          const jejak = (v: string | null) => (k === "nik" && v ? samarkanNik(v) : v);
          sebelum[k] = jejak(n[k]);
          sesudah[k] = jejak(baru[k] ?? null);
        }
      }
      if (Object.keys(sesudah).length > 0) {
        const ubahan = Object.fromEntries(
          Object.keys(sesudah).map((k) => [k, baru[k as keyof typeof baru]]),
        );
        await tx.update(nasabah).set(ubahan).where(eq(nasabah.id, id));
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "nasabah",
          barisId: id,
          aksi: "perbaiki_nasabah",
          sebelum,
          sesudah,
          pelakuId: aktor.penggunaId,
        });
      }
      return keJawaban(aktor, await satu(tx, aktor, id));
    });
  };
}
