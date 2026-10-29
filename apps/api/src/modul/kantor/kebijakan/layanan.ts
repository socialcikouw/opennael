import type { RemInput, RemNasabahInput } from "@opennael/contracts";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../../../platform/db/klien";
import { kebijakan, nasabah, pengguna } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { tidakDitemukan } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { catatRiwayat } from "../../../platform/riwayat";

/**
 * KEBIJAKAN (REM BOS) — tiga lapis: kantor, kolektor, nasabah (semua mati =
 * baris dihapus). Membaca: semua peran menurut dokumen; menulis: bos
 * (tercatat di riwayat). Docs: schema-kebijakan.md.
 */
export interface KebijakanDeps {
  db: Db;
}

const pembuat = alias(pengguna, "pembuat");
const sasaranKolektor = alias(pengguna, "sasaran_kolektor");

export function buatLayananKebijakan(deps: KebijakanDeps) {
  async function pastikanKolektor(db: Db, aktor: Aktor, kolektorId: string) {
    const [k] = await db
      .select({ id: pengguna.id })
      .from(pengguna)
      .where(and(eq(pengguna.id, kolektorId), eq(pengguna.kolektorKantorId, aktor.kantorId)));
    if (!k) throw tidakDitemukan("KOLEKTOR_TIDAK_DITEMUKAN", "Kolektor tidak ditemukan");
  }

  /** Upsert satu lapis rem; semua saklar mati → barisnya dihapus (tanpa baris = terbuka). */
  async function aturRem(
    aktor: Aktor,
    lapis: { kolektorId: string | null; nasabahId: string | null },
    rem: {
      pinjamanBaruDikunci: boolean;
      naikPinjamanDikunci: boolean;
      gulungPinjamanDikunci: boolean;
      alasanKunci?: string | null | undefined;
    },
  ) {
    wajibPeran(aktor, "bos");
    return deps.db.transaction(async (tx) => {
      const [lama] = await tx
        .select()
        .from(kebijakan)
        .where(
          and(
            eq(kebijakan.kantorId, aktor.kantorId),
            lapis.kolektorId
              ? eq(kebijakan.kolektorId, lapis.kolektorId)
              : isNull(kebijakan.kolektorId),
            lapis.nasabahId
              ? eq(kebijakan.nasabahId, lapis.nasabahId)
              : isNull(kebijakan.nasabahId),
          ),
        )
        .for("update");
      const isi = {
        pinjamanBaruDikunci: rem.pinjamanBaruDikunci,
        naikPinjamanDikunci: rem.naikPinjamanDikunci,
        gulungPinjamanDikunci: rem.gulungPinjamanDikunci,
        alasanKunci: rem.alasanKunci ?? null,
      };
      const menyala =
        isi.pinjamanBaruDikunci || isi.naikPinjamanDikunci || isi.gulungPinjamanDikunci;
      let barisId = lama?.id ?? null;
      if (!menyala) {
        if (lama) await tx.delete(kebijakan).where(eq(kebijakan.id, lama.id));
      } else if (lama) {
        await tx
          .update(kebijakan)
          .set({ ...isi, diubahOleh: aktor.penggunaId })
          .where(eq(kebijakan.id, lama.id));
      } else {
        const [baru] = await tx
          .insert(kebijakan)
          .values({ kantorId: aktor.kantorId, ...lapis, ...isi, diubahOleh: aktor.penggunaId })
          .returning({ id: kebijakan.id });
        barisId = baru?.id ?? null;
      }
      if (barisId) {
        const sebelum = lama
          ? {
              pinjamanBaruDikunci: lama.pinjamanBaruDikunci,
              naikPinjamanDikunci: lama.naikPinjamanDikunci,
              gulungPinjamanDikunci: lama.gulungPinjamanDikunci,
              alasanKunci: lama.alasanKunci,
            }
          : null;
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "kebijakan",
          barisId,
          aksi: menyala ? "atur_rem" : "lepas_rem",
          sebelum,
          sesudah: { ...lapis, ...isi },
          pelakuId: aktor.penggunaId,
        });
      }
      return { ...isi, alasanKunci: menyala ? isi.alasanKunci : null };
    });
  }

  return {
    /** Rem yang berlaku — kolektor: gabungan kantor + dirinya; lainnya: lapis kantor. */
    async kebijakanBerlaku(aktor: Aktor) {
      const baris = await deps.db
        .select()
        .from(kebijakan)
        .where(
          and(
            eq(kebijakan.kantorId, aktor.kantorId),
            isNull(kebijakan.nasabahId),
            aktor.peran === "kolektor"
              ? or(isNull(kebijakan.kolektorId), eq(kebijakan.kolektorId, aktor.penggunaId))
              : isNull(kebijakan.kolektorId),
          ),
        );
      // Alasan dari lapis paling spesifik yang mengunci.
      const urut = [...baris].sort(
        (a, b) => Number(Boolean(b.kolektorId)) - Number(Boolean(a.kolektorId)),
      );
      return {
        pinjamanBaruDikunci: baris.some((b) => b.pinjamanBaruDikunci),
        naikPinjamanDikunci: baris.some((b) => b.naikPinjamanDikunci),
        gulungPinjamanDikunci: baris.some((b) => b.gulungPinjamanDikunci),
        alasanKunci: urut.find((b) => b.alasanKunci)?.alasanKunci ?? null,
      };
    },

    /** Semua rem yang menyala, dengan lapis & sasarannya (bos, pengawas). */
    async remAktif(aktor: Aktor) {
      wajibPeran(aktor, "bos", "pengawas");
      const baris = await deps.db
        .select({
          kolektorId: sasaranKolektor.id,
          kolektorNama: sasaranKolektor.nama,
          nasabahId: nasabah.id,
          nasabahNama: nasabah.nama,
          pinjamanBaruDikunci: kebijakan.pinjamanBaruDikunci,
          naikPinjamanDikunci: kebijakan.naikPinjamanDikunci,
          gulungPinjamanDikunci: kebijakan.gulungPinjamanDikunci,
          alasanKunci: kebijakan.alasanKunci,
          olehId: pembuat.id,
          olehNama: pembuat.nama,
        })
        .from(kebijakan)
        .innerJoin(pembuat, eq(pembuat.id, kebijakan.diubahOleh))
        .leftJoin(sasaranKolektor, eq(sasaranKolektor.id, kebijakan.kolektorId))
        .leftJoin(nasabah, eq(nasabah.id, kebijakan.nasabahId))
        .where(eq(kebijakan.kantorId, aktor.kantorId))
        .orderBy(asc(kebijakan.kolektorId), asc(kebijakan.nasabahId));
      return baris.map((b) => ({
        lapis: b.nasabahId
          ? ("nasabah" as const)
          : b.kolektorId
            ? ("kolektor" as const)
            : ("kantor" as const),
        sasaran: b.nasabahId
          ? { id: b.nasabahId, nama: b.nasabahNama ?? "" }
          : b.kolektorId
            ? { id: b.kolektorId, nama: b.kolektorNama ?? "" }
            : null,
        pinjamanBaruDikunci: b.pinjamanBaruDikunci,
        naikPinjamanDikunci: b.naikPinjamanDikunci,
        gulungPinjamanDikunci: b.gulungPinjamanDikunci,
        alasanKunci: b.alasanKunci,
        diubahOleh: { id: b.olehId, nama: b.olehNama },
      }));
    },

    remKantor: (aktor: Aktor, input: RemInput) =>
      aturRem(aktor, { kolektorId: null, nasabahId: null }, input),

    async remKolektor(aktor: Aktor, kolektorId: string, input: RemInput) {
      await pastikanKolektor(deps.db, aktor, kolektorId);
      return aturRem(aktor, { kolektorId, nasabahId: null }, input);
    },

    async remNasabah(aktor: Aktor, nasabahId: string, input: RemNasabahInput) {
      const [n] = await deps.db
        .select({ id: nasabah.id })
        .from(nasabah)
        .where(and(eq(nasabah.id, nasabahId), eq(nasabah.kantorId, aktor.kantorId)));
      if (!n) throw tidakDitemukan("NASABAH_TIDAK_DITEMUKAN", "Nasabah tidak ditemukan");
      return aturRem(
        aktor,
        { kolektorId: null, nasabahId },
        { ...input, pinjamanBaruDikunci: false },
      );
    },
  };
}

export type LayananKebijakan = ReturnType<typeof buatLayananKebijakan>;
