import type { IndeksBuku, KartuTagih, Portofolio } from "@opennael/contracts";
import { and, asc, count, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { nasabah, pinjaman, ruteWilayah, transaksi, wilayah } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { wajibPeran } from "../../../platform/http/peran";
import { catatanHari } from "../../hari-kolektor";
import { bacaKalender } from "../../kantor";
import { keKartu, kolomKartu } from "./data";

export function buatKueriPinjaman(deps: { db: Db; sekarang?: (() => Date) | undefined }) {
  const sekarang = deps.sekarang ?? (() => new Date());
  return {
    /**
     * Pinjaman aktif yang dipegang kolektor ini, urut RUTE-nya (Rute 1 lebih
     * dulu), lalu kampung di luar rute menurut abjad, lalu nama nasabah.
     */
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

    /**
     * Portofolio pegangan kolektor ini (nasabah yang kini dipegangnya) per jenis:
     * banyaknya pinjaman dan Σ saldo yang berjalan, macet, dan diputihkan. Satu
     * kueri agregat — tanpa mengunduh riwayat pinjaman selesai.
     */
    async buku(aktor: Aktor): Promise<IndeksBuku[]> {
      wajibPeran(aktor, "kolektor");
      // Satu baris per nasabah (DISTINCT ON): pinjaman ke- terbesar yang tak batal, beserta
      // banyaknya pinjaman nasabah itu (jendela) — satu kueri, tanpa batas baris.
      const baris = await deps.db
        .selectDistinctOn([nasabah.id], {
          nasabahId: nasabah.id,
          nama: nasabah.nama,
          kampung: wilayah.nama,
          jumlahPinjaman: sql<number>`count(*) over (partition by ${nasabah.id})`.mapWith(Number),
          id: pinjaman.id,
          pinjamanKe: pinjaman.pinjamanKe,
          jenis: pinjaman.jenis,
          status: pinjaman.status,
          pokok: pinjaman.pokok,
          saldo: pinjaman.saldo,
          tanggalAkad: pinjaman.tanggalAkad,
          tanggalSelesai: pinjaman.tanggalSelesai,
        })
        .from(pinjaman)
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .innerJoin(wilayah, eq(wilayah.id, nasabah.wilayahId))
        .where(
          and(
            eq(pinjaman.kantorId, aktor.kantorId),
            eq(nasabah.kolektorId, aktor.penggunaId),
            ne(pinjaman.status, "batal"),
          ),
        )
        .orderBy(nasabah.id, sql`${pinjaman.pinjamanKe} desc`);
      return baris
        .flatMap(({ nasabahId, nama, kampung, jumlahPinjaman, status, ...p }) =>
          status === "batal"
            ? []
            : [
                {
                  nasabah: { id: nasabahId, nama, kampung },
                  jumlahPinjaman,
                  terakhir: { ...p, status },
                },
              ],
        )
        .sort((a, b) => a.nasabah.nama.localeCompare(b.nasabah.nama));
    },

    async portofolio(aktor: Aktor): Promise<Portofolio> {
      wajibPeran(aktor, "kolektor");
      const baris = await deps.db
        .select({
          jenis: pinjaman.jenis,
          status: pinjaman.status,
          jumlah: count(),
          saldo: sql<number>`coalesce(sum(${pinjaman.saldo}), 0)`.mapWith(Number),
          angsuran: sql<number>`coalesce(sum(${pinjaman.angsuran}), 0)`.mapWith(Number),
          tabungan: sql<number>`coalesce(sum(${nasabah.saldoTabungan}), 0)`.mapWith(Number),
          pokok: sql<number>`coalesce(sum(${pinjaman.pokok}), 0)`.mapWith(Number),
        })
        .from(pinjaman)
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .where(
          and(
            eq(pinjaman.kantorId, aktor.kantorId),
            eq(nasabah.kolektorId, aktor.penggunaId),
            inArray(pinjaman.status, ["berjalan", "macet", "diputihkan", "lunas"]),
          ),
        )
        .groupBy(pinjaman.jenis, pinjaman.status);
      // Pengurangan pokok gulung turun ada di pinjaman penerusnya (status apa pun, asal tak batal).
      const berkurang = await deps.db
        .select({
          jenis: pinjaman.jenis,
          nilai: sql<number>`coalesce(sum(${pinjaman.pokokBerkurang}), 0)`.mapWith(Number),
        })
        .from(pinjaman)
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .where(
          and(
            eq(pinjaman.kantorId, aktor.kantorId),
            eq(nasabah.kolektorId, aktor.penggunaId),
            ne(pinjaman.status, "batal"),
          ),
        )
        .groupBy(pinjaman.jenis);
      const tabunganKeluar = await deps.db
        .select({
          jenis: pinjaman.jenis,
          nilai: sql<number>`coalesce(sum(${transaksi.tabunganKeluar}), 0)`.mapWith(Number),
        })
        .from(transaksi)
        .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .where(
          and(
            eq(transaksi.kantorId, aktor.kantorId),
            eq(nasabah.kolektorId, aktor.penggunaId),
            isNull(transaksi.dibatalkanAt),
          ),
        )
        .groupBy(pinjaman.jenis);
      const nol = () => ({ jumlah: 0, saldo: 0, angsuran: 0, tabungan: 0 });
      const kosong = () => ({
        berjalan: nol(),
        macet: nol(),
        diputihkan: nol(),
        lunas: { jumlah: 0, pokok: 0 },
        penyelesaian: { pokokBerkurang: 0, tabunganKeluar: 0 },
      });
      const hasil: Portofolio = { harian: kosong(), mingguan: kosong(), tempoan: kosong() };
      for (const b of berkurang) hasil[b.jenis].penyelesaian.pokokBerkurang = b.nilai;
      for (const t of tabunganKeluar) hasil[t.jenis].penyelesaian.tabunganKeluar = t.nilai;
      for (const b of baris) {
        if (b.status === "lunas") hasil[b.jenis].lunas = { jumlah: b.jumlah, pokok: b.pokok };
        else if (b.status === "berjalan" || b.status === "macet" || b.status === "diputihkan") {
          const { jumlah, saldo, angsuran, tabungan } = b;
          hasil[b.jenis][b.status] = { jumlah, saldo, angsuran, tabungan };
        }
      }
      return hasil;
    },
  };
}
