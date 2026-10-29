import type { WilayahJawaban } from "@opennael/contracts";
import { kunciWilayah, rapikanNamaWilayah } from "@opennael/domain";
import { and, asc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import type { Db } from "../../platform/db/klien";
import {
  nasabah,
  pengguna,
  pinjaman,
  ruteKolektor,
  ruteWilayah,
  wilayah,
} from "../../platform/db/skema";
import type { Aktor } from "../../platform/http/aktor";
import { bentrok, galatPostgres, melanggar, tidakDitemukan } from "../../platform/http/galat";
import { wajibPeran } from "../../platform/http/peran";
import { catatRiwayat } from "../../platform/riwayat";

/**
 * KAMPUNG — daftar dengan pemakaian (semua peran), ganti nama atau gabung,
 * hapus kampung kosong (bos). Gabung = pindahkan nasabah & entri rute ke
 * kampung tujuan lalu hapus yang lama; versi setiap rute yang memuatnya naik
 * (layar Atur Rute yang basi ditolak). Docs: schema-wilayah.md.
 */
export interface WilayahDeps {
  db: Db;
  sekarang?: () => Date;
}

const MASIH_DIPAKAI = () =>
  bentrok("WILAYAH_MASIH_DIPAKAI", "Kampung ini masih dipakai nasabah atau rute kolektor");

const hitung = (q: ReturnType<typeof sql>) => sql<number>`(${q})`.mapWith(Number);
const kolom = {
  id: wilayah.id,
  nama: wilayah.nama,
  kunci: wilayah.kunci,
  nasabahAktif: hitung(sql`
    select count(*) from ${nasabah} join ${pinjaman} on ${pinjaman.nasabahId} = ${nasabah.id}
    where ${nasabah.wilayahId} = ${wilayah.id} and ${pinjaman.status} in ('berjalan', 'macet')`),
  nasabahTotal: hitung(
    sql`select count(*) from ${nasabah} where ${nasabah.wilayahId} = ${wilayah.id}`,
  ),
  dipakaiRute: hitung(
    sql`select count(*) from ${ruteWilayah} where ${ruteWilayah.wilayahId} = ${wilayah.id}`,
  ),
  dibuatOlehId: pengguna.id,
  dibuatOlehNama: pengguna.nama,
  dibuatAt: wilayah.dibuatAt,
};

function pilih(db: Db) {
  return db.select(kolom).from(wilayah).innerJoin(pengguna, eq(pengguna.id, wilayah.dibuatOleh));
}

function keJawaban(b: Awaited<ReturnType<ReturnType<typeof pilih>["execute"]>>[number]) {
  const { dibuatOlehId, dibuatOlehNama, dibuatAt, ...w } = b;
  return {
    ...w,
    dibuatOleh: { id: dibuatOlehId, nama: dibuatOlehNama },
    dibuatAt: dibuatAt.toISOString(),
  } satisfies WilayahJawaban;
}

export function buatLayananWilayah(deps: WilayahDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());

  async function satu(db: Db, kantorId: string, id: string) {
    const [b] = await pilih(db).where(and(eq(wilayah.id, id), eq(wilayah.kantorId, kantorId)));
    if (!b) throw new Error("kampung hilang");
    return keJawaban(b);
  }

  async function kunci(tx: Db, aktor: Aktor, id: string) {
    const [w] = await tx
      .select({ id: wilayah.id, nama: wilayah.nama })
      .from(wilayah)
      .where(and(eq(wilayah.id, id), eq(wilayah.kantorId, aktor.kantorId)))
      .for("update");
    if (!w) throw tidakDitemukan("WILAYAH_TIDAK_DITEMUKAN", "Kampung tidak ditemukan");
    return w;
  }

  /** Kolektor yang rutenya memuat kampung ini. */
  async function ruteYangMemuat(tx: Db, wilayahId: string) {
    const r = await tx
      .select({ kolektorId: ruteWilayah.kolektorId })
      .from(ruteWilayah)
      .where(eq(ruteWilayah.wilayahId, wilayahId));
    return r.map((x) => x.kolektorId);
  }

  async function naikkanVersi(tx: Db, aktor: Aktor, kolektorIds: string[]) {
    if (kolektorIds.length === 0) return;
    await tx
      .update(ruteKolektor)
      .set({ versi: sql`${ruteKolektor.versi} + 1`, diubahOleh: aktor.penggunaId })
      .where(inArray(ruteKolektor.kolektorId, kolektorIds));
  }

  return {
    /** Kampung kantor ini dengan pemakaiannya, urut nama. */
    async daftar(aktor: Aktor, saring: { baru?: number | undefined }) {
      if (saring.baru !== undefined) wajibPeran(aktor, "bos");
      const sejak = saring.baru
        ? new Date(sekarang().getTime() - saring.baru * 24 * 60 * 60 * 1000)
        : null;
      const baris = await pilih(deps.db)
        .where(
          and(
            eq(wilayah.kantorId, aktor.kantorId),
            sejak ? gte(wilayah.dibuatAt, sejak) : undefined,
          ),
        )
        .orderBy(asc(wilayah.nama));
      return baris.map(keJawaban);
    },

    /** Ganti nama; bila nama baru sudah dipakai kampung lain → gabung ke kampung itu. */
    async gantiNama(aktor: Aktor, input: { dari: string; ke: string }) {
      wajibPeran(aktor, "bos");
      return deps.db.transaction(async (tx) => {
        const lama = await kunci(tx, aktor, input.dari);
        const nama = rapikanNamaWilayah(input.ke);
        if (nama === lama.nama) throw melanggar("TIDAK_ADA_PERUBAHAN", "Namanya sudah sama");
        const [tujuan] = await tx
          .select({ id: wilayah.id, nama: wilayah.nama })
          .from(wilayah)
          .where(
            and(
              eq(wilayah.kantorId, aktor.kantorId),
              eq(wilayah.kunci, kunciWilayah(nama)),
              ne(wilayah.id, lama.id),
            ),
          )
          .for("update");
        const kolektorIds = await ruteYangMemuat(tx, lama.id);

        if (!tujuan) {
          await tx.update(wilayah).set({ nama }).where(eq(wilayah.id, lama.id));
          await naikkanVersi(tx, aktor, kolektorIds);
          await catatRiwayat(tx, {
            kantorId: aktor.kantorId,
            tabel: "wilayah",
            barisId: lama.id,
            aksi: "ganti_nama_wilayah",
            sebelum: { nama: lama.nama },
            sesudah: { nama },
            pelakuId: aktor.penggunaId,
          });
          return { ...(await satu(tx, aktor.kantorId, lama.id)), digabung: false };
        }

        // Gabung: nasabah pindah ke tujuan.
        await tx
          .update(nasabah)
          .set({ wilayahId: tujuan.id })
          .where(and(eq(nasabah.kantorId, aktor.kantorId), eq(nasabah.wilayahId, lama.id)));
        // Rute: tulis ulang utuh — lama → tujuan, entri ganda dipadatkan
        // (posisi paling depan dipertahankan), urutan dirapatkan 1..n.
        for (const kolektorId of kolektorIds) {
          const entri = await tx
            .select({ wilayahId: ruteWilayah.wilayahId })
            .from(ruteWilayah)
            .where(eq(ruteWilayah.kolektorId, kolektorId))
            .orderBy(asc(ruteWilayah.urutan));
          const urut = [
            ...new Set(entri.map((e) => (e.wilayahId === lama.id ? tujuan.id : e.wilayahId))),
          ];
          await tx.delete(ruteWilayah).where(eq(ruteWilayah.kolektorId, kolektorId));
          await tx.insert(ruteWilayah).values(
            urut.map((wilayahId, i) => ({
              kolektorId,
              kantorId: aktor.kantorId,
              wilayahId,
              urutan: i + 1,
            })),
          );
        }
        await naikkanVersi(tx, aktor, kolektorIds);
        await tx.delete(wilayah).where(eq(wilayah.id, lama.id));
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "wilayah",
          barisId: lama.id,
          aksi: "gabung_wilayah",
          sebelum: { id: lama.id, nama: lama.nama },
          sesudah: { id: tujuan.id, nama: tujuan.nama },
          pelakuId: aktor.penggunaId,
        });
        return { ...(await satu(tx, aktor.kantorId, tujuan.id)), digabung: true };
      });
    },

    /** Hapus kampung kosong (tanpa nasabah & rute). */
    async hapus(aktor: Aktor, id: string) {
      wajibPeran(aktor, "bos");
      return deps.db.transaction(async (tx) => {
        const w = await kunci(tx, aktor, id);
        const [nasabahKe] = await tx
          .select({ id: nasabah.id })
          .from(nasabah)
          .where(eq(nasabah.wilayahId, id))
          .limit(1);
        if (nasabahKe || (await ruteYangMemuat(tx, id)).length > 0) throw MASIH_DIPAKAI();
        try {
          await tx.delete(wilayah).where(eq(wilayah.id, id));
        } catch (e) {
          // Dirujuk baris yang baru masuk bersamaan (FK).
          if (galatPostgres(e)?.code === "23503") throw MASIH_DIPAKAI();
          throw e;
        }
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "wilayah",
          barisId: id,
          aksi: "hapus_wilayah",
          sebelum: { nama: w.nama },
          pelakuId: aktor.penggunaId,
        });
        return w;
      });
    },
  };
}

export type LayananWilayah = ReturnType<typeof buatLayananWilayah>;
