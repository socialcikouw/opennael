import type {
  BatalInput,
  KalenderBulan,
  LiburKantorInput,
  PekanKerjaInput,
} from "@opennael/contracts";
import { bitmaskKeHari, geserTanggal, hariKeBitmask, selisihHari } from "@opennael/domain";
import { and, asc, between, desc, eq, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../../../platform/db/klien";
import {
  liburKantor,
  liburNasabah,
  pekanKerja,
  pengguna,
  pinjaman,
  transaksi,
} from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { melanggar, tidakBolehMundur, tidakDitemukan } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { catatRiwayat } from "../../../platform/riwayat";
import { bacaKalender, hariTagihAntara } from "./kalender";

/**
 * KALENDER KANTOR — pekan kerja bertanggal (tak boleh mundur; baris yang mulai
 * hari ini boleh ditimpa), libur kantor, dan kalender sebulan. Membaca: semua
 * peran menurut dokumen; menulis: bos. Setiap perubahan tercatat di riwayat.
 * Docs: schema-pekan-kerja.md, schema-libur-kantor.md.
 */
export interface KalenderDeps {
  db: Db;
  sekarang?: () => Date;
}

/** Libur kantor dideklarasikan paling banyak 31 hari sekali kirim. */
const RENTANG_LIBUR_MAKS = 31;

const pembuat = alias(pengguna, "pembuat");

export function buatLayananKalender(deps: KalenderDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const hariIni = async (aktor: Aktor) =>
    (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal;

  return {
    /** Riwayat pola pekan kerja, terbaru dulu (bos, pengawas). */
    async daftarPekanKerja(aktor: Aktor) {
      wajibPeran(aktor, "bos", "pengawas");
      const baris = await deps.db
        .select({
          berlakuMulai: pekanKerja.berlakuMulai,
          hariKerja: pekanKerja.hariKerja,
          olehId: pembuat.id,
          olehNama: pembuat.nama,
        })
        .from(pekanKerja)
        .innerJoin(pembuat, eq(pembuat.id, pekanKerja.dibuatOleh))
        .where(eq(pekanKerja.kantorId, aktor.kantorId))
        .orderBy(desc(pekanKerja.berlakuMulai));
      return baris.map((b) => ({
        berlakuMulai: b.berlakuMulai,
        hariKerja: bitmaskKeHari(b.hariKerja),
        dibuatOleh: { id: b.olehId, nama: b.olehNama },
      }));
    },

    /** Atur pekan kerja (bos) — mulai hari ini atau sesudahnya; tanggal yang sama ditimpa. */
    async aturPekanKerja(aktor: Aktor, input: PekanKerjaInput) {
      wajibPeran(aktor, "bos");
      const hari = await hariIni(aktor);
      const mulai = input.berlakuMulai ?? hari;
      if (mulai < hari) throw tidakBolehMundur();
      const bitmask = hariKeBitmask(input.hariKerja);
      return deps.db.transaction(async (tx) => {
        const [lama] = await tx
          .select({ hariKerja: pekanKerja.hariKerja })
          .from(pekanKerja)
          .where(and(eq(pekanKerja.kantorId, aktor.kantorId), eq(pekanKerja.berlakuMulai, mulai)))
          .for("update");
        if (lama) {
          await tx
            .update(pekanKerja)
            .set({ hariKerja: bitmask, dibuatOleh: aktor.penggunaId })
            .where(
              and(eq(pekanKerja.kantorId, aktor.kantorId), eq(pekanKerja.berlakuMulai, mulai)),
            );
          await catatRiwayat(tx, {
            kantorId: aktor.kantorId,
            tabel: "pekan_kerja",
            barisId: aktor.kantorId,
            aksi: "timpa_pekan_kerja",
            sebelum: { berlakuMulai: mulai, hariKerja: bitmaskKeHari(lama.hariKerja) },
            sesudah: { berlakuMulai: mulai, hariKerja: bitmaskKeHari(bitmask) },
            pelakuId: aktor.penggunaId,
          });
        } else {
          await tx.insert(pekanKerja).values({
            kantorId: aktor.kantorId,
            berlakuMulai: mulai,
            hariKerja: bitmask,
            dibuatOleh: aktor.penggunaId,
          });
        }
        const [nama] = await tx
          .select({ nama: pengguna.nama })
          .from(pengguna)
          .where(eq(pengguna.id, aktor.penggunaId));
        return {
          berlakuMulai: mulai,
          hariKerja: bitmaskKeHari(bitmask),
          dibuatOleh: { id: aktor.penggunaId, nama: nama?.nama ?? "" },
        };
      });
    },

    async kalenderBulan(aktor: Aktor, bulan: string): Promise<KalenderBulan> {
      wajibPeran(aktor, "kolektor", "pengawas", "bos");
      const awal = `${bulan}-01`;
      const [tahun = 0, nomorBulan = 0] = bulan.split("-").map(Number);
      const akhir = new Date(Date.UTC(tahun, nomorBulan, 0)).toISOString().slice(0, 10);
      const [hariTagih, libur] = await Promise.all([
        hariTagihAntara(deps.db, aktor.kantorId, awal, akhir),
        deps.db
          .select({ tanggal: liburKantor.tanggal, alasan: liburKantor.alasanLibur })
          .from(liburKantor)
          .where(
            and(
              eq(liburKantor.kantorId, aktor.kantorId),
              between(liburKantor.tanggal, awal, akhir),
            ),
          )
          .orderBy(asc(liburKantor.tanggal)),
      ]);
      return { hariTagih, liburKantor: libur };
    },

    /** Libur kantor dalam rentang (semua peran) — bawaan hari ini s/d 90 hari ke depan. */
    async daftarLibur(aktor: Aktor, saring: { tanggalMulai?: string; tanggalSelesai?: string }) {
      const mulai = saring.tanggalMulai ?? (await hariIni(aktor));
      const selesai = saring.tanggalSelesai ?? geserTanggal(mulai, 90);
      const baris = await deps.db
        .select({ tanggal: liburKantor.tanggal, alasan: liburKantor.alasanLibur })
        .from(liburKantor)
        .where(
          and(
            eq(liburKantor.kantorId, aktor.kantorId),
            between(liburKantor.tanggal, mulai, selesai),
          ),
        )
        .orderBy(asc(liburKantor.tanggal));
      return baris;
    },

    /**
     * Deklarasi libur (bos) — hari ini atau ke depan; rentang dipecah per
     * tanggal, yang sudah ada dilewati. Hari ini ditolak bila sudah berjalan
     * (ada setoran, akad, atau libur nasabah).
     */
    async deklarasiLibur(aktor: Aktor, input: LiburKantorInput) {
      wajibPeran(aktor, "bos");
      const hari = await hariIni(aktor);
      const mulai = input.tanggalMulai;
      const selesai = input.tanggalSelesai ?? mulai;
      if (mulai < hari) throw tidakBolehMundur();
      if (selesai < mulai)
        throw melanggar("RENTANG_TIDAK_SAH", "Tanggal selesai sebelum tanggal mulai");
      if (selisihHari(mulai, selesai) >= RENTANG_LIBUR_MAKS) {
        throw melanggar(
          "RENTANG_TERLALU_PANJANG",
          `Paling banyak ${RENTANG_LIBUR_MAKS} hari sekali kirim`,
        );
      }
      return deps.db.transaction(async (tx) => {
        if (mulai === hari) {
          const [t] = await tx
            .select({ id: transaksi.id })
            .from(transaksi)
            .where(
              and(
                eq(transaksi.kantorId, aktor.kantorId),
                eq(transaksi.tanggal, hari),
                isNull(transaksi.dibatalkanAt),
              ),
            )
            .limit(1);
          const [a] = await tx
            .select({ id: pinjaman.id })
            .from(pinjaman)
            .where(
              and(
                eq(pinjaman.kantorId, aktor.kantorId),
                eq(pinjaman.tanggalAkad, hari),
                ne(pinjaman.status, "batal"),
                ne(pinjaman.asal, "migrasi"),
              ),
            )
            .limit(1);
          const [l] = await tx
            .select({ id: liburNasabah.id })
            .from(liburNasabah)
            .where(and(eq(liburNasabah.kantorId, aktor.kantorId), eq(liburNasabah.tanggal, hari)))
            .limit(1);
          if (t || a || l) {
            throw melanggar(
              "LIBUR_KANTOR_HARI_SUDAH_BERJALAN",
              "Hari ini sudah ada setoran, akad, atau libur nasabah — tak bisa diliburkan",
            );
          }
        }
        const ditambah: string[] = [];
        const dilewati: string[] = [];
        for (let t = mulai; t <= selesai; t = geserTanggal(t, 1)) {
          const [baru] = await tx
            .insert(liburKantor)
            .values({
              kantorId: aktor.kantorId,
              tanggal: t,
              alasanLibur: input.alasan,
              dibuatOleh: aktor.penggunaId,
            })
            .onConflictDoNothing({ target: [liburKantor.kantorId, liburKantor.tanggal] })
            .returning({ id: liburKantor.id });
          if (!baru) {
            dilewati.push(t);
            continue;
          }
          ditambah.push(t);
          await catatRiwayat(tx, {
            kantorId: aktor.kantorId,
            tabel: "libur_kantor",
            barisId: baru.id,
            aksi: "deklarasi_libur_kantor",
            sesudah: { tanggal: t, alasan: input.alasan },
            pelakuId: aktor.penggunaId,
          });
        }
        return { ditambah, dilewati };
      });
    },

    /** Batal libur kantor (bos) — hanya tanggal yang belum tiba; jejak di riwayat. */
    async batalLibur(aktor: Aktor, tanggal: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      if (tanggal <= (await hariIni(aktor))) {
        throw melanggar(
          "HANYA_LIBUR_BELUM_TIBA",
          "Hanya libur kantor yang belum tiba yang bisa dibatalkan",
        );
      }
      return deps.db.transaction(async (tx) => {
        const [lama] = await tx
          .delete(liburKantor)
          .where(and(eq(liburKantor.kantorId, aktor.kantorId), eq(liburKantor.tanggal, tanggal)))
          .returning();
        if (!lama) throw tidakDitemukan("LIBUR_TIDAK_DITEMUKAN", "Libur kantor tidak ditemukan");
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "libur_kantor",
          barisId: lama.id,
          aksi: "batal_libur_kantor",
          sebelum: { tanggal: lama.tanggal, alasan: lama.alasanLibur },
          alasan: input.alasan,
          pelakuId: aktor.penggunaId,
        });
        return { tanggal: lama.tanggal, alasan: lama.alasanLibur };
      });
    },
  };
}

export type LayananKalender = ReturnType<typeof buatLayananKalender>;
