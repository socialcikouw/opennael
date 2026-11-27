import type { ArusJenis, PembandingPortofolio, PotretJenis } from "@opennael/contracts";
import { geserTanggal, type JenisPinjaman } from "@opennael/domain";
import { and, between, eq, gte, isNull, lte, max, ne, sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { nasabah, pinjaman, posisiHarian, transaksi } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";

const URUTAN: readonly JenisPinjaman[] = ["harian", "mingguan", "tempoan"];

const jumlahBila = (syarat: ReturnType<typeof sql>, nilai: ReturnType<typeof sql> | unknown) =>
  sql<number>`coalesce(sum(case when ${syarat} then ${nilai} else 0 end), 0)`.mapWith(Number);

/** `2026-11` → hari terakhir bulan itu. */
function akhirBulan(bulan: string): string {
  const [th, bl] = bulan.split("-").map(Number);
  const hari = new Date(Date.UTC(th ?? 1970, bl ?? 1, 0)).getUTCDate();
  return `${bulan}-${String(hari).padStart(2, "0")}`;
}

/**
 * Pembanding Portofolio pegangan kolektor ini — lihat `pembandingPortofolioSchema`. Tiga kueri:
 * potret akhir bulan lalu, arus pinjaman (lunas / macet baru / pokok berkurang) dua rentang
 * sekaligus, dan tabungan keluar dua rentang sekaligus.
 */
export async function pembandingPortofolio(
  db: Db,
  aktor: Aktor,
  hariIni: string,
): Promise<PembandingPortofolio> {
  const ini = { mulai: `${hariIni.slice(0, 7)}-01`, selesai: hariIni };
  const awalLalu = geserTanggal(ini.mulai, -1).slice(0, 7);
  const ujungLalu = akhirBulan(awalLalu);
  const lalu = {
    mulai: `${awalLalu}-01`,
    // Tanggal sepadan, dipangkas ke akhir bulan lalu (31 Mar → 28/29 Feb).
    selesai: `${awalLalu}-${String(
      Math.min(Number(hariIni.slice(8, 10)), Number(ujungLalu.slice(8, 10))),
    ).padStart(2, "0")}`,
  };

  // Potret terakhir bulan lalu (biasanya hari terakhirnya).
  const [t] = await db
    .select({ tanggal: max(posisiHarian.tanggal) })
    .from(posisiHarian)
    .where(
      and(
        eq(posisiHarian.kantorId, aktor.kantorId),
        eq(posisiHarian.kolektorId, aktor.penggunaId),
        gte(posisiHarian.tanggal, lalu.mulai),
        lte(posisiHarian.tanggal, ujungLalu),
      ),
    );
  const tanggalPotret = t?.tanggal ?? null;
  let potret: PembandingPortofolio["potret"] = null;
  if (tanggalPotret) {
    const baris = await db
      .select({
        jenis: posisiHarian.jenis,
        jumlahBerjalan: posisiHarian.jumlahBerjalan,
        jumlahMacet: posisiHarian.jumlahMacet,
        saldoBerjalan: posisiHarian.saldoBerjalan,
        saldoMacet: posisiHarian.saldoMacet,
        angsuranBerjalan: posisiHarian.angsuranBerjalan,
        angsuranMacet: posisiHarian.angsuranMacet,
      })
      .from(posisiHarian)
      .where(
        and(
          eq(posisiHarian.kantorId, aktor.kantorId),
          eq(posisiHarian.kolektorId, aktor.penggunaId),
          eq(posisiHarian.tanggal, tanggalPotret),
        ),
      );
    const nol: PotretJenis = {
      jumlahBerjalan: 0,
      jumlahMacet: 0,
      saldoBerjalan: 0,
      saldoMacet: 0,
      angsuranBerjalan: 0,
      angsuranMacet: 0,
    };
    const ambil = (j: JenisPinjaman): PotretJenis => {
      const b = baris.find((x) => x.jenis === j);
      if (!b) return nol;
      const { jenis: _j, ...isi } = b;
      return isi;
    };
    potret = { harian: ambil("harian"), mingguan: ambil("mingguan"), tempoan: ambil("tempoan") };
  }

  const dalam = (kolom: unknown, r: { mulai: string; selesai: string }) =>
    sql`${kolom} between ${r.mulai} and ${r.selesai}`;
  const lunas = sql`${pinjaman.status} = 'lunas'`;
  const arusPinjaman = await db
    .select({
      jenis: pinjaman.jenis,
      lunasIni: jumlahBila(sql`${lunas} and ${dalam(pinjaman.tanggalSelesai, ini)}`, 1),
      lunasLalu: jumlahBila(sql`${lunas} and ${dalam(pinjaman.tanggalSelesai, lalu)}`, 1),
      pokokLunasIni: jumlahBila(
        sql`${lunas} and ${dalam(pinjaman.tanggalSelesai, ini)}`,
        pinjaman.pokok,
      ),
      pokokLunasLalu: jumlahBila(
        sql`${lunas} and ${dalam(pinjaman.tanggalSelesai, lalu)}`,
        pinjaman.pokok,
      ),
      macetIni: jumlahBila(dalam(pinjaman.tanggalMacet, ini), 1),
      macetLalu: jumlahBila(dalam(pinjaman.tanggalMacet, lalu), 1),
      berkurangIni: jumlahBila(dalam(pinjaman.tanggalAkad, ini), pinjaman.pokokBerkurang),
      berkurangLalu: jumlahBila(dalam(pinjaman.tanggalAkad, lalu), pinjaman.pokokBerkurang),
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
  const arusTabungan = await db
    .select({
      jenis: pinjaman.jenis,
      ini: jumlahBila(dalam(transaksi.tanggal, ini), transaksi.tabunganKeluar),
      lalu: jumlahBila(dalam(transaksi.tanggal, lalu), transaksi.tabunganKeluar),
    })
    .from(transaksi)
    .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
    .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
    .where(
      and(
        eq(transaksi.kantorId, aktor.kantorId),
        eq(nasabah.kolektorId, aktor.penggunaId),
        isNull(transaksi.dibatalkanAt),
        between(transaksi.tanggal, lalu.mulai, ini.selesai),
      ),
    )
    .groupBy(pinjaman.jenis);

  const susun = (sisi: "Ini" | "Lalu") => {
    const arus = (j: JenisPinjaman): ArusJenis => {
      const p = arusPinjaman.find((x) => x.jenis === j);
      const tb = arusTabungan.find((x) => x.jenis === j);
      return {
        lunas: p?.[`lunas${sisi}`] ?? 0,
        pokokLunas: p?.[`pokokLunas${sisi}`] ?? 0,
        macetBaru: p?.[`macet${sisi}`] ?? 0,
        tabunganKeluar: (sisi === "Ini" ? tb?.ini : tb?.lalu) ?? 0,
        pokokBerkurang: p?.[`berkurang${sisi}`] ?? 0,
      };
    };
    return Object.fromEntries(URUTAN.map((j) => [j, arus(j)])) as Record<JenisPinjaman, ArusJenis>;
  };

  return {
    tanggalPotret,
    potret,
    bulanIni: { ...ini, arus: susun("Ini") },
    bulanLalu: { ...lalu, arus: susun("Lalu") },
  };
}
