import {
  awalJendelaMacet,
  hariPerluDitutup,
  mulaiDitagih,
  nilaiMacet,
  tanggalMasukPembukuan,
} from "@opennael/domain";
import { and, between, eq, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import type { Db } from "../../db/klien";
import { kantor, nasabah, pinjaman, posisiHarian, transaksi } from "../../db/skema";
import { hariTagihAntara } from "../lapangan/gerbang";

/**
 * TUTUP HARI — sapuan tengah malam per kantor (aturan-usaha F, docs/skema/
 * schema-posisi-harian.md, schema-kantor.md). Satu transaksi per kantor:
 *
 *   1. majukan `kantor.tanggal_tutup_terakhir` (klaim; tak pernah mundur —
 *      0 baris = sudah ditutup, berhenti; aman diulang & dijalankan bersamaan);
 *   2. nilai macet / pulih pinjaman aktif untuk hari itu (jendela 30 hari);
 *   3. potret portofolio per pemegang & jenis: hapus lalu tulis.
 */
export interface TutupHariDeps {
  db: Db;
  sekarang?: () => Date;
}

export interface HasilTutupHari {
  kantorId: string;
  tanggal: string;
  keMacet: number;
  pulih: number;
  potret: number;
}

const jumlah = <T>(nilai: T) => sql<number>`coalesce(sum(${nilai}), 0)`.mapWith(Number);
const banyak = (syarat: ReturnType<typeof sql>) =>
  sql<number>`count(*) filter (where ${syarat})`.mapWith(Number);
const jumlahBila = <T>(nilai: T, syarat: ReturnType<typeof sql>) =>
  sql<number>`coalesce(sum(${nilai}) filter (where ${syarat}), 0)`.mapWith(Number);

export function buatLayananTutupHari(deps: TutupHariDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());

  /** Nilai macet / pulih pinjaman aktif kantor pada penutupan `tanggal`. */
  async function nilaiSemua(tx: Db, kantorId: string, tanggal: string) {
    const awal = awalJendelaMacet(tanggal);
    const hariTagih = await hariTagihAntara(tx, kantorId, awal, tanggal);
    const setoranJendela = tx
      .select({
        pinjamanId: transaksi.pinjamanId,
        murni: jumlah(transaksi.setoranMurni).as("murni"),
      })
      .from(transaksi)
      .where(
        and(
          eq(transaksi.kantorId, kantorId),
          between(transaksi.tanggal, awal, tanggal),
          isNull(transaksi.dibatalkanAt),
        ),
      )
      .groupBy(transaksi.pinjamanId)
      .as("setoran_jendela");
    const aktif = await tx
      .select({
        id: pinjaman.id,
        jenis: pinjaman.jenis,
        status: pinjaman.status,
        angsuran: pinjaman.angsuran,
        tanggalAkad: pinjaman.tanggalAkad,
        tanggalDisalin: pinjaman.tanggalDisalin,
        jatuhTempo: pinjaman.jatuhTempo,
        setoranMurni: sql<number>`coalesce(${setoranJendela.murni}, 0)`.mapWith(Number),
      })
      .from(pinjaman)
      .leftJoin(setoranJendela, eq(setoranJendela.pinjamanId, pinjaman.id))
      .where(
        and(
          eq(pinjaman.kantorId, kantorId),
          inArray(pinjaman.status, ["berjalan", "macet"]),
          // Akad sesudah hari yang ditutup belum ikut dinilai.
          lte(sql`coalesce(${pinjaman.tanggalDisalin}, ${pinjaman.tanggalAkad})`, tanggal),
        ),
      );

    const keMacet: string[] = [];
    const pulih: string[] = [];
    for (const p of aktif) {
      const status = p.status as "berjalan" | "macet";
      const mulai = mulaiDitagih(p);
      const hasil = nilaiMacet(
        {
          jenis: p.jenis,
          status,
          angsuran: p.angsuran,
          tanggalMasuk: tanggalMasukPembukuan(p),
          jatuhTempo: p.jatuhTempo,
          hariTagih: hariTagih.filter((t) => t >= mulai).length,
          setoranMurni: p.setoranMurni,
        },
        tanggal,
      );
      if (hasil.status === status) continue;
      (hasil.status === "macet" ? keMacet : pulih).push(p.id);
    }
    if (keMacet.length > 0) {
      await tx
        .update(pinjaman)
        .set({ status: "macet", tanggalMacet: tanggal })
        .where(and(inArray(pinjaman.id, keMacet), eq(pinjaman.status, "berjalan")));
    }
    if (pulih.length > 0) {
      await tx
        .update(pinjaman)
        .set({ status: "berjalan", tanggalMacet: null })
        .where(and(inArray(pinjaman.id, pulih), eq(pinjaman.status, "macet")));
    }
    return { keMacet: keMacet.length, pulih: pulih.length };
  }

  /** Potret portofolio per pemegang & jenis untuk `tanggal` — hapus lalu tulis. */
  async function tulisPotret(tx: Db, kantorId: string, tanggal: string) {
    await tx
      .delete(posisiHarian)
      .where(and(eq(posisiHarian.kantorId, kantorId), eq(posisiHarian.tanggal, tanggal)));
    const berjalan = sql`${pinjaman.status} = 'berjalan'`;
    const macet = sql`${pinjaman.status} = 'macet'`;
    const baris = await tx
      .select({
        kolektorId: nasabah.kolektorId,
        jenis: pinjaman.jenis,
        jumlahBerjalan: banyak(berjalan),
        jumlahMacet: banyak(macet),
        saldoBerjalan: jumlahBila(pinjaman.saldo, berjalan),
        saldoMacet: jumlahBila(pinjaman.saldo, macet),
        angsuranBerjalan: jumlahBila(pinjaman.angsuran, berjalan),
        angsuranMacet: jumlahBila(pinjaman.angsuran, macet),
      })
      .from(pinjaman)
      .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
      .where(
        and(
          eq(pinjaman.kantorId, kantorId),
          inArray(pinjaman.status, ["berjalan", "macet"]),
          lte(sql`coalesce(${pinjaman.tanggalDisalin}, ${pinjaman.tanggalAkad})`, tanggal),
        ),
      )
      .groupBy(nasabah.kolektorId, pinjaman.jenis);
    if (baris.length > 0) {
      await tx.insert(posisiHarian).values(baris.map((b) => ({ ...b, kantorId, tanggal })));
    }
    return baris.length;
  }

  /**
   * Tutup satu hari satu kantor. `null` = hari itu (atau yang lebih baru)
   * sudah ditutup — tidak ada yang dikerjakan.
   */
  async function tutupHari(kantorId: string, tanggal: string): Promise<HasilTutupHari | null> {
    return deps.db.transaction(async (tx) => {
      const klaim = await tx
        .update(kantor)
        .set({ tanggalTutupTerakhir: tanggal })
        .where(
          and(
            eq(kantor.id, kantorId),
            or(isNull(kantor.tanggalTutupTerakhir), lt(kantor.tanggalTutupTerakhir, tanggal)),
          ),
        )
        .returning({ id: kantor.id });
      if (klaim.length === 0) return null;
      // Trigger riwayat status membaca tanggal pembukuan pulih dari sini.
      await tx.execute(sql`select set_config('nael.tanggal_pembukuan', ${tanggal}, true)`);
      const macet = await nilaiSemua(tx, kantorId, tanggal);
      const potret = await tulisPotret(tx, kantorId, tanggal);
      await tx.execute(sql`select set_config('nael.tanggal_pembukuan', '', true)`);
      return { kantorId, tanggal, ...macet, potret };
    });
  }

  return {
    tutupHari,

    /**
     * Detak penjadwal: tutup kemarin untuk setiap kantor yang tengah malamnya
     * sudah lewat (zona masing-masing). Galat satu kantor tidak menghentikan
     * kantor lain.
     */
    async sapu(): Promise<{
      selesai: HasilTutupHari[];
      gagal: { kantorId: string; galat: unknown }[];
    }> {
      const saat = sekarang();
      const semua = await deps.db
        .select({
          id: kantor.id,
          zona: kantor.zonaWaktu,
          tanggalTutupTerakhir: kantor.tanggalTutupTerakhir,
        })
        .from(kantor);
      const selesai: HasilTutupHari[] = [];
      const gagal: { kantorId: string; galat: unknown }[] = [];
      for (const k of semua) {
        const tanggal = hariPerluDitutup(saat, k.zona, k.tanggalTutupTerakhir);
        if (!tanggal) continue;
        try {
          const hasil = await tutupHari(k.id, tanggal);
          if (hasil) selesai.push(hasil);
        } catch (galat) {
          gagal.push({ kantorId: k.id, galat });
        }
      }
      return { selesai, gagal };
    },
  };
}

export type LayananTutupHari = ReturnType<typeof buatLayananTutupHari>;
