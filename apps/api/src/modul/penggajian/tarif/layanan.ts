import type { TarifInput } from "@opennael/contracts";
import { tarifBerlaku } from "@opennael/domain";
import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../../../platform/db/klien";
import { pengguna, tarifGaji } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import {
  dilarang,
  melanggar,
  tidakBolehMundur,
  tidakDitemukan,
} from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { catatRiwayat } from "../../../platform/riwayat";
import { bacaKalender } from "../../kantor";

/**
 * TARIF GAJI — persen storting kantor / khusus kolektor, bertanggal (tak boleh
 * mundur; baris yang mulai hari ini boleh ditimpa). Membaca: bos, pengawas,
 * kolektor (miliknya); menulis: bos (tercatat di riwayat).
 * Docs: schema-tarif-gaji.md.
 */
export interface TarifDeps {
  db: Db;
  sekarang?: () => Date;
}

const sasaranKolektor = alias(pengguna, "sasaran_kolektor");

export function buatLayananTarif(deps: TarifDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const hariIni = async (aktor: Aktor) =>
    (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal;

  async function pastikanKolektor(db: Db, aktor: Aktor, kolektorId: string) {
    const [k] = await db
      .select({ id: pengguna.id })
      .from(pengguna)
      .where(and(eq(pengguna.id, kolektorId), eq(pengguna.kolektorKantorId, aktor.kantorId)));
    if (!k) throw tidakDitemukan("KOLEKTOR_TIDAK_DITEMUKAN", "Kolektor tidak ditemukan");
  }

  return {
    /** Riwayat seluruh tarif kantor, terbaru dulu (bos, pengawas). */
    async daftarTarif(aktor: Aktor) {
      wajibPeran(aktor, "bos", "pengawas");
      const baris = await deps.db
        .select({
          id: tarifGaji.id,
          kolektorId: sasaranKolektor.id,
          kolektorNama: sasaranKolektor.nama,
          tarifBp: tarifGaji.tarifBp,
          berlakuMulai: tarifGaji.berlakuMulai,
        })
        .from(tarifGaji)
        .leftJoin(sasaranKolektor, eq(sasaranKolektor.id, tarifGaji.kolektorId))
        .where(eq(tarifGaji.kantorId, aktor.kantorId))
        .orderBy(desc(tarifGaji.berlakuMulai), asc(tarifGaji.kolektorId));
      return baris.map((b) => ({
        id: b.id,
        kolektor: b.kolektorId ? { id: b.kolektorId, nama: b.kolektorNama ?? "" } : null,
        tarifBp: b.tarifBp,
        berlakuMulai: b.berlakuMulai,
      }));
    },

    /** Tarif hari ini + sumbernya — kolektor: miliknya; tanpa kolektor = tarif kantor. */
    async tarifBerlaku(aktor: Aktor, saring: { kolektorId?: string }) {
      wajibPeran(aktor, "bos", "pengawas", "kolektor");
      let kolektorId = saring.kolektorId;
      if (aktor.peran === "kolektor") {
        if (kolektorId && kolektorId !== aktor.penggunaId) {
          throw dilarang("BUKAN_MILIK_ANDA", "Anda hanya bisa melihat tarif Anda sendiri");
        }
        kolektorId = aktor.penggunaId;
      }
      const hari = await hariIni(aktor);
      const tarif = await deps.db
        .select({
          kolektorId: tarifGaji.kolektorId,
          tarifBp: tarifGaji.tarifBp,
          berlakuMulai: tarifGaji.berlakuMulai,
        })
        .from(tarifGaji)
        .where(
          and(
            eq(tarifGaji.kantorId, aktor.kantorId),
            kolektorId
              ? or(isNull(tarifGaji.kolektorId), eq(tarifGaji.kolektorId, kolektorId))
              : isNull(tarifGaji.kolektorId),
          ),
        );
      const tarifBp = tarifBerlaku(tarif, kolektorId ?? "", hari);
      const khusus = tarif
        .filter((t) => t.kolektorId && t.berlakuMulai <= hari)
        .sort((a, b) => (a.berlakuMulai < b.berlakuMulai ? 1 : -1))[0];
      return {
        tarifBp,
        sumber: khusus && khusus.tarifBp !== null ? ("kolektor" as const) : ("kantor" as const),
      };
    },

    /** Atur tarif (bos) — mulai hari ini atau sesudahnya; tanggal yang sama ditimpa. */
    async aturTarif(aktor: Aktor, input: TarifInput) {
      wajibPeran(aktor, "bos");
      const kolektorId = input.kolektorId ?? null;
      if (!kolektorId && input.tarifBp === null) {
        throw melanggar("TARIF_KANTOR_WAJIB_PERSEN", "Tarif kantor wajib berpersen");
      }
      if (kolektorId) await pastikanKolektor(deps.db, aktor, kolektorId);
      const hari = await hariIni(aktor);
      const mulai = input.berlakuMulai ?? hari;
      if (mulai < hari) throw tidakBolehMundur();
      return deps.db.transaction(async (tx) => {
        const [lama] = await tx
          .select()
          .from(tarifGaji)
          .where(
            and(
              eq(tarifGaji.kantorId, aktor.kantorId),
              kolektorId ? eq(tarifGaji.kolektorId, kolektorId) : isNull(tarifGaji.kolektorId),
              eq(tarifGaji.berlakuMulai, mulai),
            ),
          )
          .for("update");
        let id: string;
        if (lama) {
          await tx
            .update(tarifGaji)
            .set({ tarifBp: input.tarifBp, dibuatOleh: aktor.penggunaId })
            .where(eq(tarifGaji.id, lama.id));
          await catatRiwayat(tx, {
            kantorId: aktor.kantorId,
            tabel: "tarif_gaji",
            barisId: lama.id,
            aksi: "timpa_tarif_gaji",
            sebelum: { tarifBp: lama.tarifBp },
            sesudah: { tarifBp: input.tarifBp },
            pelakuId: aktor.penggunaId,
          });
          id = lama.id;
        } else {
          const [baru] = await tx
            .insert(tarifGaji)
            .values({
              kantorId: aktor.kantorId,
              kolektorId,
              tarifBp: input.tarifBp,
              berlakuMulai: mulai,
              dibuatOleh: aktor.penggunaId,
            })
            .returning({ id: tarifGaji.id });
          if (!baru) throw new Error("tarif tak tersimpan");
          id = baru.id;
        }
        const [nama] = kolektorId
          ? await tx
              .select({ nama: pengguna.nama })
              .from(pengguna)
              .where(eq(pengguna.id, kolektorId))
          : [];
        return {
          id,
          kolektor: kolektorId ? { id: kolektorId, nama: nama?.nama ?? "" } : null,
          tarifBp: input.tarifBp,
          berlakuMulai: mulai,
        };
      });
    },
  };
}

export type LayananTarif = ReturnType<typeof buatLayananTarif>;
