import type { NasabahLama } from "@opennael/contracts";
import { and, asc, desc, eq, inArray, isNull, ne, notExists } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { nasabah, pinjaman, wilayah } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { wajibPeran } from "../../../platform/http/peran";

export function buatKueriNasabah(deps: { db: Db }) {
  return {
    /** Pegangan tanpa pinjaman aktif — calon pinjam lagi. */
    async daftarNasabahLama(aktor: Aktor): Promise<NasabahLama[]> {
      wajibPeran(aktor, "kolektor");
      const aktif = deps.db
        .select({ id: pinjaman.id })
        .from(pinjaman)
        .where(
          and(eq(pinjaman.nasabahId, nasabah.id), inArray(pinjaman.status, ["berjalan", "macet"])),
        );
      const baris = await deps.db
        .select({
          id: nasabah.id,
          nama: nasabah.nama,
          kampung: wilayah.nama,
          tabungan: nasabah.saldoTabungan,
        })
        .from(nasabah)
        .innerJoin(wilayah, eq(wilayah.id, nasabah.wilayahId))
        .where(
          and(
            eq(nasabah.kolektorId, aktor.penggunaId),
            isNull(nasabah.diblokirAt),
            notExists(aktif),
          ),
        )
        .orderBy(asc(wilayah.nama), asc(nasabah.nama));
      if (baris.length === 0) return [];

      // Pinjaman terakhir (bukan batal) per nasabah — patokan jenis & pokok pinjam lagi.
      const riwayat = await deps.db
        .selectDistinctOn([pinjaman.nasabahId], {
          nasabahId: pinjaman.nasabahId,
          pinjamanKe: pinjaman.pinjamanKe,
          jenis: pinjaman.jenis,
          pokok: pinjaman.pokok,
        })
        .from(pinjaman)
        .where(
          and(
            inArray(
              pinjaman.nasabahId,
              baris.map((b) => b.id),
            ),
            ne(pinjaman.status, "batal"),
          ),
        )
        .orderBy(pinjaman.nasabahId, desc(pinjaman.pinjamanKe));
      const terakhir = new Map(riwayat.map(({ nasabahId, ...r }) => [nasabahId, r]));
      return baris.map((b) => ({ ...b, terakhir: terakhir.get(b.id) ?? null }));
    },
  };
}
