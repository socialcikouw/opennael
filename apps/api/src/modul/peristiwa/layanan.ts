import type { Peristiwa, SaringPeristiwa } from "@opennael/contracts";
import { geserTanggal, selisihHari } from "@opennael/domain";
import { and, eq, gte, isNull, lte, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../../db/klien";
import { liburNasabah, nasabah, pengguna, pinjaman, transaksi } from "../../db/skema";
import { dilarang, melanggar, tidakDitemukan } from "../../galat";
import { wajibPeran } from "../../peran";
import type { Aktor } from "../auth/token";
import type { LayananNasabah } from "../nasabah/layanan";
import type { LayananPinjaman } from "../pinjaman/layanan";

/**
 * PERISTIWA PINJAMAN — transaksi berlaku + libur nasabah dalam satu bentuk
 * (C3: satu peristiwa per pinjaman per hari), grid bulanan, satu transaksi,
 * Buku nasabah. Bos & pengawas: semua; kolektor: pinjaman pegangannya
 * (pemegang saat ini, bukan pencatat). Docs: schema-transaksi.md.
 */
export interface PeristiwaDeps {
  db: Db;
  nasabah: LayananNasabah;
  pinjaman: LayananPinjaman;
}

/** Rentang paling panjang tanpa `pinjamanId` (hari, termasuk ujungnya). */
const RENTANG_MAKS = 62;
const pencatat = alias(pengguna, "pencatat");
const pembatal = alias(pengguna, "pembatal");

interface Saringan {
  pinjamanId?: string | undefined;
  nasabahId?: string | undefined;
  kolektorId?: string | undefined;
  jenis?: SaringPeristiwa["jenis"];
  mulai?: string | undefined;
  selesai?: string | undefined;
}

/** Kolektor dipaksa ke pegangannya; meminta pegangan orang lain → 403. */
function pegangan(aktor: Aktor, kolektorId: string | undefined) {
  wajibPeran(aktor, "bos", "pengawas", "kolektor");
  if (aktor.peran !== "kolektor") return kolektorId;
  if (kolektorId && kolektorId !== aktor.penggunaId) {
    throw dilarang("BUKAN_MILIK_ANDA", "Anda hanya bisa melihat pegangan Anda sendiri");
  }
  return aktor.penggunaId;
}

export function buatLayananPeristiwa(deps: PeristiwaDeps) {
  /** Transaksi berlaku + libur, urut tanggal lalu waktu catat. */
  async function peristiwa(kantorId: string, s: Saringan): Promise<Peristiwa[]> {
    const syaratPinjaman = (tanggal: typeof transaksi.tanggal | typeof liburNasabah.tanggal) =>
      [
        eq(pinjaman.kantorId, kantorId),
        s.pinjamanId ? eq(pinjaman.id, s.pinjamanId) : undefined,
        s.nasabahId ? eq(pinjaman.nasabahId, s.nasabahId) : undefined,
        s.kolektorId ? eq(nasabah.kolektorId, s.kolektorId) : undefined,
        s.jenis ? eq(pinjaman.jenis, s.jenis) : undefined,
        s.mulai ? gte(tanggal, s.mulai) : undefined,
        s.selesai ? lte(tanggal, s.selesai) : undefined,
      ].filter((x): x is SQL => x !== undefined);

    const uang = await deps.db
      .select({
        id: transaksi.id,
        pinjamanId: transaksi.pinjamanId,
        nasabahId: nasabah.id,
        nasabahNama: nasabah.nama,
        pencatatId: pencatat.id,
        pencatatNama: pencatat.nama,
        tanggal: transaksi.tanggal,
        jenis: transaksi.jenis,
        setoranMurni: transaksi.setoranMurni,
        setoranPelunasan: transaksi.setoranPelunasan,
        tabunganKeluar: transaksi.tabunganKeluar,
        storting: transaksi.storting,
        saldoSesudah: transaksi.saldoSesudah,
        dibuatAt: transaksi.dibuatAt,
      })
      .from(transaksi)
      .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
      .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
      .innerJoin(pencatat, eq(pencatat.id, transaksi.pencatatId))
      .where(and(isNull(transaksi.dibatalkanAt), ...syaratPinjaman(transaksi.tanggal)));
    const libur = await deps.db
      .select({
        id: liburNasabah.id,
        pinjamanId: liburNasabah.pinjamanId,
        nasabahId: nasabah.id,
        nasabahNama: nasabah.nama,
        pencatatId: pencatat.id,
        pencatatNama: pencatat.nama,
        tanggal: liburNasabah.tanggal,
        alasanLibur: liburNasabah.alasanLibur,
        dibuatAt: liburNasabah.dibuatAt,
      })
      .from(liburNasabah)
      .innerJoin(pinjaman, eq(pinjaman.id, liburNasabah.pinjamanId))
      .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
      .innerJoin(pencatat, eq(pencatat.id, liburNasabah.pencatatId))
      .where(and(...syaratPinjaman(liburNasabah.tanggal)));

    const semua: Peristiwa[] = [
      ...uang.map(
        ({
          nasabahId,
          nasabahNama,
          pencatatId,
          pencatatNama,
          jenis,
          dibuatAt,
          storting,
          ...t
        }) => ({
          ...t,
          nasabah: { id: nasabahId, nama: nasabahNama },
          pencatat: { id: pencatatId, nama: pencatatNama },
          kategori: jenis,
          storting: storting ?? 0,
          alasanLibur: null,
          dibuatAt: dibuatAt.toISOString(),
        }),
      ),
      ...libur.map(({ nasabahId, nasabahNama, pencatatId, pencatatNama, dibuatAt, ...l }) => ({
        ...l,
        nasabah: { id: nasabahId, nama: nasabahNama },
        pencatat: { id: pencatatId, nama: pencatatNama },
        kategori: "libur" as const,
        setoranMurni: 0,
        setoranPelunasan: 0,
        tabunganKeluar: 0,
        storting: 0,
        saldoSesudah: null,
        dibuatAt: dibuatAt.toISOString(),
      })),
    ];
    return semua.sort((a, b) =>
      a.tanggal === b.tanggal
        ? a.dibuatAt.localeCompare(b.dibuatAt)
        : a.tanggal < b.tanggal
          ? -1
          : 1,
    );
  }

  return {
    /** Peristiwa berlaku menurut saringan; tanpa pinjaman wajib bertanggal (≤ 62 hari). */
    async daftar(aktor: Aktor, saring: SaringPeristiwa) {
      const kolektorId = pegangan(aktor, saring.kolektorId);
      const mulai = saring.tanggal ?? saring.tanggalMulai;
      const selesai = saring.tanggal ?? saring.tanggalSelesai;
      if (mulai && selesai && mulai > selesai) {
        throw melanggar("RENTANG_TIDAK_SAH", "Tanggal mulai sesudah tanggal selesai");
      }
      if (!saring.pinjamanId) {
        if (!mulai || !selesai) {
          throw melanggar("RENTANG_TIDAK_SAH", "Pilih tanggal, atau rentang tanggal mulai–selesai");
        }
        if (selisihHari(mulai, selesai) + 1 > RENTANG_MAKS) {
          throw melanggar("RENTANG_TIDAK_SAH", `Rentang paling panjang ${RENTANG_MAKS} hari`);
        }
      }
      return peristiwa(aktor.kantorId, {
        pinjamanId: saring.pinjamanId,
        kolektorId,
        jenis: saring.jenis,
        mulai,
        selesai,
      });
    },

    /** Isi grid kartu satu bulan kalender untuk pinjaman yang dipegang. */
    async rekapBulanan(aktor: Aktor, saring: { bulan: string; kolektorId?: string | undefined }) {
      const kolektorId = pegangan(aktor, saring.kolektorId);
      const awal = `${saring.bulan}-01`;
      // Hari terakhir = sehari sebelum tanggal 1 bulan berikutnya.
      const akhir = geserTanggal(`${geserTanggal(awal, 31).slice(0, 7)}-01`, -1);
      const hasil = await peristiwa(aktor.kantorId, { kolektorId, mulai: awal, selesai: akhir });
      return hasil.map((p) => ({
        pinjamanId: p.pinjamanId,
        tanggal: p.tanggal,
        kategori: p.kategori,
      }));
    },

    /** Satu transaksi lengkap, termasuk yang dibatalkan. */
    async transaksi(aktor: Aktor, id: string) {
      wajibPeran(aktor, "bos", "pengawas", "kolektor");
      const [t] = await deps.db
        .select({
          id: transaksi.id,
          pinjamanId: transaksi.pinjamanId,
          tanggal: transaksi.tanggal,
          jenis: transaksi.jenis,
          setoranMurni: transaksi.setoranMurni,
          setoranPelunasan: transaksi.setoranPelunasan,
          tabunganKeluar: transaksi.tabunganKeluar,
          storting: transaksi.storting,
          saldoSesudah: transaksi.saldoSesudah,
          dibuatAt: transaksi.dibuatAt,
          pencatatId: pencatat.id,
          pencatatNama: pencatat.nama,
          dibatalkanAt: transaksi.dibatalkanAt,
          pembatalId: pembatal.id,
          pembatalNama: pembatal.nama,
          alasanBatal: transaksi.alasanBatal,
          pemegang: nasabah.kolektorId,
        })
        .from(transaksi)
        .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .innerJoin(pencatat, eq(pencatat.id, transaksi.pencatatId))
        .leftJoin(pembatal, eq(pembatal.id, transaksi.dibatalkanOleh))
        .where(and(eq(transaksi.id, id), eq(transaksi.kantorId, aktor.kantorId)));
      if (!t) throw tidakDitemukan("TRANSAKSI_TIDAK_DITEMUKAN", "Transaksi tidak ditemukan");
      if (aktor.peran === "kolektor" && t.pemegang !== aktor.penggunaId) {
        throw dilarang("BUKAN_PEGANGAN_ANDA", "Nasabah ini dipegang kolektor lain");
      }
      const {
        pencatatId,
        pencatatNama,
        dibatalkanAt,
        pembatalId,
        pembatalNama,
        alasanBatal,
        pemegang: _,
        dibuatAt,
        storting,
        ...isi
      } = t;
      return {
        ...isi,
        storting: storting ?? 0,
        pencatat: { id: pencatatId, nama: pencatatNama },
        dibuatAt: dibuatAt.toISOString(),
        dibatalkan:
          dibatalkanAt && pembatalId && pembatalNama && alasanBatal
            ? {
                at: dibatalkanAt.toISOString(),
                oleh: { id: pembatalId, nama: pembatalNama },
                alasan: alasanBatal,
              }
            : null,
      };
    },

    /** Buku nasabah: identitas + semua pinjaman (urut ke-) + semua peristiwa berlaku. */
    async buku(aktor: Aktor, nasabahId: string) {
      const n = await deps.nasabah.baca(aktor, nasabahId);
      const daftar = await deps.pinjaman.daftar(aktor, { status: "semua", nasabahId });
      return {
        nasabah: n,
        pinjaman: [...daftar].sort((a, b) => a.pinjamanKe - b.pinjamanKe),
        peristiwa: await peristiwa(aktor.kantorId, { nasabahId }),
      };
    },
  };
}

export type LayananPeristiwa = ReturnType<typeof buatLayananPeristiwa>;
