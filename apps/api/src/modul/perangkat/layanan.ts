import type { PerangkatJawaban } from "@opennael/contracts";
import { and, desc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../../db/klien";
import { pengguna, perangkat } from "../../db/skema";
import { bentrok, dilarang, tidakDitemukan } from "../../galat";
import type { Aktor } from "../auth/token";

/**
 * PERANGKAT YANG MASUK — daftar (bos: seluruh kantor, peran lain: miliknya)
 * dan memutus satu perangkat. Milik sendiri → alasan `keluar`; bos memutus
 * perangkat orang lain → `diputus`. Token akses yang sudah terbit habis
 * dengan sendirinya (≤ 15 menit); token segarnya langsung ditolak.
 * Docs: schema-perangkat.md.
 */
export interface PerangkatDeps {
  db: Db;
  sekarang?: () => Date;
}

const pemutus = alias(pengguna, "pemutus");

export function buatLayananPerangkat(deps: PerangkatDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());

  return {
    async daftar(aktor: Aktor, saring: { termasukDiputus?: "true" | "false" | undefined }) {
      const riwayat = saring.termasukDiputus === "true";
      if (riwayat && aktor.peran !== "bos") {
        throw dilarang("PERAN_DILARANG", "Riwayat perangkat hanya untuk bos");
      }
      const baris = await deps.db
        .select({
          id: perangkat.id,
          penggunaId: pengguna.id,
          penggunaNama: pengguna.nama,
          peran: pengguna.peran,
          nama: perangkat.nama,
          platform: perangkat.platform,
          terakhirAktifAt: perangkat.terakhirAktifAt,
          kedaluwarsaAt: perangkat.kedaluwarsaAt,
          dibuatAt: perangkat.dibuatAt,
          diputusAt: perangkat.diputusAt,
          alasanPutus: perangkat.alasanPutus,
          pemutusId: pemutus.id,
          pemutusNama: pemutus.nama,
        })
        .from(perangkat)
        .innerJoin(pengguna, eq(pengguna.id, perangkat.penggunaId))
        .leftJoin(pemutus, eq(pemutus.id, perangkat.diputusOleh))
        .where(
          and(
            eq(perangkat.kantorId, aktor.kantorId),
            aktor.peran === "bos" ? undefined : eq(perangkat.penggunaId, aktor.penggunaId),
            riwayat ? undefined : isNull(perangkat.diputusAt),
          ),
        )
        .orderBy(desc(perangkat.terakhirAktifAt));
      return baris.map(
        (b): PerangkatJawaban => ({
          id: b.id,
          pengguna: { id: b.penggunaId, nama: b.penggunaNama, peran: b.peran },
          nama: b.nama,
          platform: b.platform,
          terakhirAktifAt: b.terakhirAktifAt.toISOString(),
          kedaluwarsaAt: b.kedaluwarsaAt.toISOString(),
          dibuatAt: b.dibuatAt.toISOString(),
          sedangDipakai: b.id === aktor.perangkatId,
          diputus:
            b.diputusAt && b.alasanPutus
              ? {
                  at: b.diputusAt.toISOString(),
                  oleh:
                    b.pemutusId && b.pemutusNama ? { id: b.pemutusId, nama: b.pemutusNama } : null,
                  alasan: b.alasanPutus,
                }
              : null,
        }),
      );
    },

    /** Putus satu perangkat — milik sendiri (`keluar`) atau, bos, perangkat lain (`diputus`). */
    async putus(aktor: Aktor, id: string) {
      return deps.db.transaction(async (tx) => {
        const [p] = await tx
          .select({ penggunaId: perangkat.penggunaId, diputusAt: perangkat.diputusAt })
          .from(perangkat)
          .where(and(eq(perangkat.id, id), eq(perangkat.kantorId, aktor.kantorId)))
          .for("update");
        if (!p) throw tidakDitemukan("PERANGKAT_TIDAK_DITEMUKAN", "Perangkat tidak ditemukan");
        const milikSendiri = p.penggunaId === aktor.penggunaId;
        if (!milikSendiri && aktor.peran !== "bos") {
          throw dilarang("BUKAN_MILIK_ANDA", "Anda hanya bisa memutus perangkat Anda sendiri");
        }
        if (p.diputusAt) {
          throw bentrok("PERANGKAT_SUDAH_DIPUTUS", "Perangkat ini sudah tidak tertaut");
        }
        await tx
          .update(perangkat)
          .set({
            diputusAt: sekarang(),
            diputusOleh: aktor.penggunaId,
            alasanPutus: milikSendiri ? "keluar" : "diputus",
          })
          .where(eq(perangkat.id, id));
        return { id, alasan: milikSendiri ? ("keluar" as const) : ("diputus" as const) };
      });
    },
  };
}

export type LayananPerangkat = ReturnType<typeof buatLayananPerangkat>;
