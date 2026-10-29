import type {
  BatalInput,
  LiburKantorInput,
  PekanKerjaInput,
  RemInput,
  RemNasabahInput,
  TarifInput,
  UbahKantorInput,
} from "@opennael/contracts";
import {
  bitmaskKeHari,
  geserTanggal,
  hariKeBitmask,
  menitDariJam,
  selisihHari,
  tarifBerlaku,
} from "@opennael/domain";
import { and, asc, between, desc, eq, isNull, lte, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../../platform/db/klien";
import {
  kantor,
  kebijakan,
  liburKantor,
  liburNasabah,
  nasabah,
  pekanKerja,
  pengguna,
  pinjaman,
  tarifGaji,
  transaksi,
} from "../../platform/db/skema";
import type { Aktor } from "../../platform/http/aktor";
import { dilarang, melanggar, tidakDitemukan } from "../../platform/http/galat";
import { wajibPeran } from "../../platform/http/peran";
import { catatRiwayat } from "../../platform/riwayat";
import { bacaKalender } from "../lapangan/gerbang";

/**
 * PENGATURAN KANTOR — profil kantor, pekan kerja & tarif gaji bertanggal
 * (tak boleh mundur; baris yang mulai hari ini boleh ditimpa), rem bos tiga
 * lapis (semua mati = baris dihapus), libur kantor. Membaca: semua peran
 * menurut dokumen; menulis: bos. Setiap perubahan tercatat di riwayat.
 * Docs: schema-kantor.md, schema-pekan-kerja.md, schema-kebijakan.md,
 * schema-libur-kantor.md, schema-tarif-gaji.md.
 */
export interface PengaturanDeps {
  db: Db;
  sekarang?: () => Date;
}

/** Libur kantor dideklarasikan paling banyak 31 hari sekali kirim. */
const RENTANG_LIBUR_MAKS = 31;
const TIDAK_BOLEH_MUNDUR = () =>
  melanggar(
    "TIDAK_BOLEH_MUNDUR",
    "Tidak bisa diberlakukan mundur — mulai hari ini atau sesudahnya",
  );

const jamHHMM = (t: string) => t.slice(0, 5);
const pembuat = alias(pengguna, "pembuat");
const sasaranKolektor = alias(pengguna, "sasaran_kolektor");

export function buatLayananPengaturan(deps: PengaturanDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const hariIni = async (aktor: Aktor) =>
    (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal;

  async function bacaKantor(db: Db, aktor: Aktor) {
    const [k] = await db.select().from(kantor).where(eq(kantor.id, aktor.kantorId));
    if (!k) throw new Error("kantor hilang");
    const [pola] = await db
      .select({ hariKerja: pekanKerja.hariKerja })
      .from(pekanKerja)
      .where(
        and(
          eq(pekanKerja.kantorId, aktor.kantorId),
          lte(pekanKerja.berlakuMulai, await hariIni(aktor)),
        ),
      )
      .orderBy(desc(pekanKerja.berlakuMulai))
      .limit(1);
    return {
      id: k.id,
      nama: k.nama,
      zonaWaktu: k.zonaWaktu,
      hariKerja: pola ? bitmaskKeHari(pola.hariKerja) : [],
      jamBuka: jamHHMM(k.jamBuka),
      jamTutup: jamHHMM(k.jamTutup),
    };
  }

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
    // ---- kantor & pekan kerja ----------------------------------------------------

    /** Profil kantor + pola hari kerja yang berlaku hari ini (semua peran). */
    kantor: (aktor: Aktor) => bacaKantor(deps.db, aktor),

    /** Ubah profil kantor (bos) — kolom yang berubah tercatat di riwayat. */
    async ubahKantor(aktor: Aktor, input: UbahKantorInput) {
      wajibPeran(aktor, "bos");
      return deps.db.transaction(async (tx) => {
        const lama = await bacaKantor(tx, aktor);
        const baru = {
          ...lama,
          ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
        };
        if (menitDariJam(baru.jamBuka) >= menitDariJam(baru.jamTutup)) {
          throw melanggar("JAM_TIDAK_SAH", "Jam buka harus sebelum jam tutup");
        }
        const sebelum: Record<string, unknown> = {};
        const sesudah: Record<string, unknown> = {};
        for (const k of ["nama", "zonaWaktu", "jamBuka", "jamTutup"] as const) {
          if (baru[k] !== lama[k]) {
            sebelum[k] = lama[k];
            sesudah[k] = baru[k];
          }
        }
        if (Object.keys(sesudah).length === 0) return lama;
        await tx.update(kantor).set(sesudah).where(eq(kantor.id, aktor.kantorId));
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "kantor",
          barisId: aktor.kantorId,
          aksi: "ubah_kantor",
          sebelum,
          sesudah,
          pelakuId: aktor.penggunaId,
        });
        return bacaKantor(tx, aktor);
      });
    },

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
      if (mulai < hari) throw TIDAK_BOLEH_MUNDUR();
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

    // ---- kebijakan ---------------------------------------------------------------

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

    // ---- libur kantor --------------------------------------------------------------

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
      if (mulai < hari) throw TIDAK_BOLEH_MUNDUR();
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

    // ---- tarif gaji ----------------------------------------------------------------

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
      if (mulai < hari) throw TIDAK_BOLEH_MUNDUR();
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

export type LayananPengaturan = ReturnType<typeof buatLayananPengaturan>;
