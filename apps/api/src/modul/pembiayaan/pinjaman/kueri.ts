import type { KartuTagih, Portofolio } from "@opennael/contracts";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { nasabah, pinjaman, ruteWilayah, wilayah } from "../../../platform/db/skema";
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
      const nol = () => ({ jumlah: 0, saldo: 0, angsuran: 0, tabungan: 0 });
      const kosong = () => ({
        berjalan: nol(),
        macet: nol(),
        diputihkan: nol(),
        lunas: { jumlah: 0 },
      });
      const hasil: Portofolio = { harian: kosong(), mingguan: kosong(), tempoan: kosong() };
      for (const b of baris) {
        if (b.status === "lunas") hasil[b.jenis].lunas = { jumlah: b.jumlah };
        else if (b.status === "berjalan" || b.status === "macet" || b.status === "diputihkan") {
          const { jumlah, saldo, angsuran, tabungan } = b;
          hasil[b.jenis][b.status] = { jumlah, saldo, angsuran, tabungan };
        }
      }
      return hasil;
    },
  };
}
