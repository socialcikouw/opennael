import type { KalenderBulan, KartuTagih, NasabahLama } from "@opennael/contracts";
import { and, asc, between, desc, eq, inArray, isNull, ne, notExists, sql } from "drizzle-orm";
import { liburKantor, nasabah, pinjaman, ruteWilayah, wilayah } from "../../platform/db/skema";
import type { Aktor } from "../../platform/http/aktor";
import { wajibPeran } from "../../platform/http/peran";
import { catatanHari, hariIni, keKartu, kolomKartu, type LapanganDeps } from "./data";
import { bacaKalender, hariTagihAntara, kalenderGerbang, VALIDASI_PENUH } from "./gerbang";
export function buatKueriLapangan(deps: LapanganDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const validasi = deps.validasiKalender ?? VALIDASI_PENUH;
  return {
    async keadaanHariIni(aktor: Aktor) {
      wajibPeran(aktor, "kolektor");
      const kal = kalenderGerbang(
        await bacaKalender(deps.db, aktor.kantorId, sekarang()),
        validasi,
      );
      return { kalender: kal, hari: await hariIni(deps.db, aktor, kal.tanggal) };
    },
    async daftarPinjaman(aktor: Aktor): Promise<KartuTagih[]> {
      wajibPeran(aktor, "kolektor");
      const { tanggal } = await bacaKalender(deps.db, aktor.kantorId, sekarang());
      const baris = await deps.db
        .select({ ...kolomKartu, tabungan: nasabah.saldoTabungan, ruteKe: ruteWilayah.urutan })
        .from(pinjaman)
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .innerJoin(wilayah, eq(wilayah.id, nasabah.wilayahId))
        .leftJoin(
          ruteWilayah,
          and(
            eq(ruteWilayah.kolektorId, aktor.penggunaId),
            eq(ruteWilayah.wilayahId, nasabah.wilayahId),
          ),
        )
        .where(
          and(
            eq(nasabah.kolektorId, aktor.penggunaId),
            inArray(pinjaman.status, ["berjalan", "macet"]),
          ),
        )
        .orderBy(sql`${ruteWilayah.urutan} ASC NULLS LAST`, asc(wilayah.nama), asc(nasabah.nama));
      const ids = baris.map((b) => b.id);
      if (ids.length === 0) return [];

      const catatan = await catatanHari(deps.db, ids, tanggal);
      return baris.map(({ tabungan, ruteKe, ...b }) => ({
        ...keKartu(b),
        tabungan,
        ruteKe,
        hariIni: catatan.get(b.id) ?? null,
      }));
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
    async daftarKampung(aktor: Aktor) {
      wajibPeran(aktor, "kolektor", "bos");
      return deps.db
        .select({ id: wilayah.id, nama: wilayah.nama })
        .from(wilayah)
        .where(eq(wilayah.kantorId, aktor.kantorId))
        .orderBy(asc(wilayah.nama));
    },
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
