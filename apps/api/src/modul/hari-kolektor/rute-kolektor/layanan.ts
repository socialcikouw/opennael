import type { SimpanRuteInput } from "@opennael/contracts";
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { pengguna, ruteKolektor, ruteWilayah, wilayah } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { bentrok, dilarang, melanggar, tidakDitemukan } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { catatRiwayat } from "../../../platform/riwayat";
import { pastikanWilayah } from "../../lapangan/layanan";

/**
 * RUTE KOLEKTOR — dibaca kolektor (miliknya), bos & pengawas; disimpan
 * kolektor (miliknya) & bos. Disimpan utuh sekali jalan di bawah penjaga
 * `versi`: penyimpan menyebut versi yang terakhir ia baca, basi → 409.
 * Nama kampung dipastikan SESUDAH versi diperiksa. Urutan lama & baru
 * tercatat di riwayat. Docs: schema-rute.md.
 */
export interface RuteDeps {
  db: Db;
}

const RUTE_VERSI_BASI = () =>
  bentrok("RUTE_VERSI_BASI", "Rute ini baru saja diubah orang lain — muat ulang lalu susun lagi");

export function buatLayananRute(deps: RuteDeps) {
  /** Kolektor sasaran: kolektor = dirinya; bos/pengawas wajib menyebut, milik kantor. */
  async function sasaran(aktor: Aktor, kolektorId: string | undefined) {
    if (aktor.peran === "kolektor") {
      if (kolektorId && kolektorId !== aktor.penggunaId) {
        throw dilarang("BUKAN_MILIK_ANDA", "Anda hanya bisa mengatur rute Anda sendiri");
      }
      return aktor.penggunaId;
    }
    if (!kolektorId) throw melanggar("KOLEKTOR_WAJIB", "Sebutkan kolektornya");
    const [k] = await deps.db
      .select({ id: pengguna.id })
      .from(pengguna)
      .where(and(eq(pengguna.id, kolektorId), eq(pengguna.kolektorKantorId, aktor.kantorId)));
    if (!k) throw tidakDitemukan("KOLEKTOR_TIDAK_DITEMUKAN", "Kolektor tidak ditemukan");
    return kolektorId;
  }

  async function bacaRute(db: Db, kolektorId: string) {
    const [kepala] = await db
      .select({
        versi: ruteKolektor.versi,
        diubahAt: ruteKolektor.diubahAt,
        olehId: pengguna.id,
        olehNama: pengguna.nama,
      })
      .from(ruteKolektor)
      .leftJoin(pengguna, eq(pengguna.id, ruteKolektor.diubahOleh))
      .where(eq(ruteKolektor.kolektorId, kolektorId));
    const urutan = await db
      .select({ wilayahId: wilayah.id, nama: wilayah.nama })
      .from(ruteWilayah)
      .innerJoin(wilayah, eq(wilayah.id, ruteWilayah.wilayahId))
      .where(eq(ruteWilayah.kolektorId, kolektorId))
      .orderBy(asc(ruteWilayah.urutan));
    return {
      kolektorId,
      urutan,
      versi: kepala?.versi ?? 0,
      diubahOleh: kepala?.olehId ? { id: kepala.olehId, nama: kepala.olehNama ?? "" } : null,
      diubahAt: kepala?.diubahAt.toISOString() ?? null,
    };
  }

  return {
    async baca(aktor: Aktor, saring: { kolektorId?: string }) {
      wajibPeran(aktor, "kolektor", "bos", "pengawas");
      return bacaRute(deps.db, await sasaran(aktor, saring.kolektorId));
    },

    async simpan(aktor: Aktor, input: SimpanRuteInput) {
      wajibPeran(aktor, "kolektor", "bos");
      const kolektorId = await sasaran(aktor, input.kolektorId);
      return deps.db.transaction(async (tx) => {
        const [kepala] = await tx
          .select({ versi: ruteKolektor.versi })
          .from(ruteKolektor)
          .where(eq(ruteKolektor.kolektorId, kolektorId))
          .for("update");
        if ((kepala?.versi ?? 0) !== input.versi) throw RUTE_VERSI_BASI();
        if (!kepala) {
          // Rute pertama: dua penyimpan pertama bersamaan → yang kedua basi.
          const [baru] = await tx
            .insert(ruteKolektor)
            .values({ kolektorId, kantorId: aktor.kantorId, diubahOleh: aktor.penggunaId })
            .onConflictDoNothing({ target: ruteKolektor.kolektorId })
            .returning({ versi: ruteKolektor.versi });
          if (!baru) throw RUTE_VERSI_BASI();
        } else {
          await tx
            .update(ruteKolektor)
            .set({ versi: kepala.versi + 1, diubahOleh: aktor.penggunaId })
            .where(eq(ruteKolektor.kolektorId, kolektorId));
        }

        // Kampung diketik dipastikan sesudah versi lolos; kembar dipadatkan, posisi depan menang.
        const ids: string[] = [];
        for (const k of input.urutan) {
          const id = await pastikanWilayah(tx, aktor, k);
          if (!ids.includes(id)) ids.push(id);
        }
        const lama = await tx
          .delete(ruteWilayah)
          .where(eq(ruteWilayah.kolektorId, kolektorId))
          .returning({ wilayahId: ruteWilayah.wilayahId, urutan: ruteWilayah.urutan });
        if (ids.length > 0) {
          await tx.insert(ruteWilayah).values(
            ids.map((wilayahId, i) => ({
              kolektorId,
              kantorId: aktor.kantorId,
              wilayahId,
              urutan: i + 1,
            })),
          );
        }
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "rute_kolektor",
          barisId: kolektorId,
          aksi: "simpan_rute",
          sebelum: {
            urutan: lama.sort((a, b) => a.urutan - b.urutan).map((r) => r.wilayahId),
          },
          sesudah: { urutan: ids },
          pelakuId: aktor.penggunaId,
        });
        return bacaRute(tx, kolektorId);
      });
    },
  };
}

export type LayananRute = ReturnType<typeof buatLayananRute>;
