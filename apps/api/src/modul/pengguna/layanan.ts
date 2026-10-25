import type { NonaktifkanInput, Peran, UbahPenggunaInput } from "@opennael/contracts";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "../../db/klien";
import { nasabah, pengguna, perangkat, pinjaman } from "../../db/skema";
import { bentrok, melanggar, tidakDitemukan } from "../../galat";
import { wajibPeran } from "../../peran";
import { catatRiwayat } from "../../riwayat";
import type { Aktor } from "../auth/token";

/**
 * KELOLA KARYAWAN (bos) — daftar, sunting, nonaktifkan (semua perangkat
 * diputus), aktifkan. Akun baru lahir lewat tautan QR. Setiap perubahan
 * tercatat di `riwayat_perubahan` (tabel `pengguna`).
 * Docs: schema-pengguna.md.
 */
export interface PenggunaDeps {
  db: Db;
  sekarang?: () => Date;
}

const kolom = {
  id: pengguna.id,
  peran: pengguna.peran,
  nama: pengguna.nama,
  nomorHp: pengguna.nomorHp,
  resort: pengguna.resort,
  dinonaktifkanAt: pengguna.dinonaktifkanAt,
  alasanNonaktif: pengguna.alasanNonaktif,
  perangkatAktif: sql<number>`(
    SELECT count(*) FROM ${perangkat}
     WHERE ${perangkat.penggunaId} = ${pengguna.id} AND ${perangkat.diputusAt} IS NULL
  )`.mapWith(Number),
};

interface BarisPengguna {
  id: string;
  peran: Peran;
  nama: string;
  nomorHp: string | null;
  resort: string | null;
  dinonaktifkanAt: Date | null;
  alasanNonaktif: string | null;
  perangkatAktif: number;
}

const keJawaban = ({ dinonaktifkanAt, ...p }: BarisPengguna) => ({
  ...p,
  aktif: dinonaktifkanAt === null,
  dinonaktifkanAt: dinonaktifkanAt?.toISOString() ?? null,
});

export function buatLayananPengguna(deps: PenggunaDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());

  async function satu(db: Db, aktor: Aktor, id: string) {
    const [p] = await db
      .select(kolom)
      .from(pengguna)
      .where(and(eq(pengguna.id, id), eq(pengguna.kantorId, aktor.kantorId)));
    if (!p) throw tidakDitemukan("PENGGUNA_TIDAK_DITEMUKAN", "Akun tidak ditemukan");
    return p;
  }

  return {
    /** Daftar akun kantor — kasir & pengawas hanya kolektor; kolektor ditolak. */
    async daftar(aktor: Aktor, saring: { peran?: Peran; termasukNonaktif?: "ya" | "tidak" }) {
      wajibPeran(aktor, "bos", "kasir", "pengawas");
      const peran = aktor.peran === "bos" ? saring.peran : "kolektor";
      const baris = await deps.db
        .select(kolom)
        .from(pengguna)
        .where(
          and(
            eq(pengguna.kantorId, aktor.kantorId),
            peran ? eq(pengguna.peran, peran) : undefined,
            saring.termasukNonaktif === "ya" ? undefined : isNull(pengguna.dinonaktifkanAt),
          ),
        )
        .orderBy(asc(pengguna.peran), asc(pengguna.nama));
      return baris.map(keJawaban);
    },

    /** Sunting nama, nomor HP, resort (bos). */
    async ubah(aktor: Aktor, id: string, input: UbahPenggunaInput) {
      wajibPeran(aktor, "bos");
      return deps.db.transaction(async (tx) => {
        const p = await satu(tx, aktor, id);
        if (input.resort !== undefined && input.resort !== null && p.peran !== "kolektor") {
          throw melanggar("RESORT_HANYA_KOLEKTOR", "Resort hanya untuk kolektor");
        }
        if (input.nomorHp === null && p.peran === "bos") {
          throw melanggar(
            "NOMOR_HP_BOS_WAJIB",
            "Nomor HP bos dipakai untuk masuk — tak bisa dihapus",
          );
        }
        const sebelum: Record<string, unknown> = {};
        const sesudah: Record<string, unknown> = {};
        for (const k of ["nama", "nomorHp", "resort"] as const) {
          if (input[k] !== undefined && input[k] !== p[k]) {
            sebelum[k] = p[k];
            sesudah[k] = input[k];
          }
        }
        if (Object.keys(sesudah).length === 0) return keJawaban(p);
        await tx.update(pengguna).set(sesudah).where(eq(pengguna.id, id));
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "pengguna",
          barisId: id,
          aksi: "ubah_pengguna",
          sebelum,
          sesudah,
          pelakuId: aktor.penggunaId,
        });
        return keJawaban(await satu(tx, aktor, id));
      });
    },

    /**
     * Nonaktifkan akun (bos) — semua perangkatnya diputus di transaksi yang
     * sama. Bos tak bisa menonaktifkan diri; kolektor yang masih memegang
     * nasabah berpinjaman aktif harus dipindah dulu.
     */
    async nonaktifkan(aktor: Aktor, id: string, input: NonaktifkanInput) {
      wajibPeran(aktor, "bos");
      if (id === aktor.penggunaId) {
        throw melanggar(
          "TIDAK_BISA_MENONAKTIFKAN_DIRI",
          "Bos tidak bisa menonaktifkan dirinya sendiri",
        );
      }
      return deps.db.transaction(async (tx) => {
        const [p] = await tx
          .select({ peran: pengguna.peran, dinonaktifkanAt: pengguna.dinonaktifkanAt })
          .from(pengguna)
          .where(and(eq(pengguna.id, id), eq(pengguna.kantorId, aktor.kantorId)))
          .for("update");
        if (!p) throw tidakDitemukan("PENGGUNA_TIDAK_DITEMUKAN", "Akun tidak ditemukan");
        if (p.dinonaktifkanAt) throw bentrok("SUDAH_NONAKTIF", "Akun ini sudah nonaktif");
        if (p.peran === "kolektor") {
          const [pegang] = await tx
            .select({ id: pinjaman.id })
            .from(pinjaman)
            .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
            .where(and(eq(nasabah.kolektorId, id), inArray(pinjaman.status, ["berjalan", "macet"])))
            .limit(1);
          if (pegang) {
            throw melanggar(
              "KOLEKTOR_MASIH_MEMEGANG_NASABAH",
              "Kolektor ini masih memegang nasabah berpinjaman aktif — pindahkan dulu",
            );
          }
        }
        const kini = sekarang();
        await tx
          .update(pengguna)
          .set({
            dinonaktifkanAt: kini,
            dinonaktifkanOleh: aktor.penggunaId,
            alasanNonaktif: input.alasan,
          })
          .where(eq(pengguna.id, id));
        const putus = await tx
          .update(perangkat)
          .set({ diputusAt: kini, diputusOleh: aktor.penggunaId, alasanPutus: "dinonaktifkan" })
          .where(and(eq(perangkat.penggunaId, id), isNull(perangkat.diputusAt)))
          .returning({ id: perangkat.id });
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "pengguna",
          barisId: id,
          aksi: "nonaktifkan",
          sebelum: { aktif: true },
          sesudah: { aktif: false, perangkatDiputus: putus.length },
          alasan: input.alasan,
          pelakuId: aktor.penggunaId,
        });
        return keJawaban(await satu(tx, aktor, id));
      });
    },

    /** Aktifkan kembali (bos) — perangkat harus ditautkan ulang. */
    async aktifkan(aktor: Aktor, id: string) {
      wajibPeran(aktor, "bos");
      return deps.db.transaction(async (tx) => {
        const p = await satu(tx, aktor, id);
        if (!p.dinonaktifkanAt) throw melanggar("SUDAH_AKTIF", "Akun ini sudah aktif");
        await tx
          .update(pengguna)
          .set({ dinonaktifkanAt: null, dinonaktifkanOleh: null, alasanNonaktif: null })
          .where(eq(pengguna.id, id));
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "pengguna",
          barisId: id,
          aksi: "aktifkan",
          sebelum: { aktif: false, alasanNonaktif: p.alasanNonaktif },
          sesudah: { aktif: true },
          pelakuId: aktor.penggunaId,
        });
        return keJawaban(await satu(tx, aktor, id));
      });
    },
  };
}

export type LayananPengguna = ReturnType<typeof buatLayananPengguna>;
