import { gajiKotor, tarifBerlaku } from "@opennael/domain";
import { and, between, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import {
  hariKolektor,
  pembayaranGaji,
  pengguna,
  serahTerimaKas,
  tarifGaji,
  transaksi,
} from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { tidakDitemukan } from "../../../platform/http/galat";

/** Pembantu privat GAJI: perhitungan periode, pemeriksaan slip, dan pemeta slip. */

/** Yang dibutuhkan semua kueri & operasi satu layanan: database, jam, dan "hari ini" kantor aktor. */
export interface Konteks {
  db: Db;
  sekarang: () => Date;
  hariIni: (aktor: Aktor) => Promise<string>;
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

export async function namaKolektor(db: Db, aktor: Aktor, kolektorId: string) {
  const [k] = await db
    .select({ nama: pengguna.nama })
    .from(pengguna)
    .where(and(eq(pengguna.id, kolektorId), eq(pengguna.kolektorKantorId, aktor.kantorId)));
  if (!k) throw tidakDitemukan("KOLEKTOR_TIDAK_DITEMUKAN", "Kolektor tidak ditemukan");
  return k.nama;
}

/** Slip berlaku yang periodenya bertumpuk dengan [mulai, selesai]. */
export async function sudahDibayar(db: Db, kolektorId: string, mulai: string, selesai: string) {
  const [ada] = await db
    .select({ id: pembayaranGaji.id })
    .from(pembayaranGaji)
    .where(
      and(
        eq(pembayaranGaji.kolektorId, kolektorId),
        isNull(pembayaranGaji.dibatalkanAt),
        lte(pembayaranGaji.periodeMulai, selesai),
        gte(pembayaranGaji.periodeSelesai, mulai),
      ),
    )
    .limit(1);
  return Boolean(ada);
}

/** Rincian harian, gaji kotor, dan potongan tekor satu kolektor satu periode. */
export async function hitung(
  db: Db,
  aktor: Aktor,
  kolektorId: string,
  mulai: string,
  selesai: string,
) {
  const storting = await db
    .select({
      tanggal: transaksi.tanggal,
      storting: sql<number>`sum(${transaksi.storting})`.mapWith(Number),
    })
    .from(transaksi)
    .where(
      and(
        eq(transaksi.pencatatId, kolektorId),
        between(transaksi.tanggal, mulai, selesai),
        isNull(transaksi.dibatalkanAt),
      ),
    )
    .groupBy(transaksi.tanggal);
  // Tekor satu hari = kurang setor serah terima berlaku + arsip tekor lama.
  const tekor = await db
    .select({
      tanggal: hariKolektor.tanggal,
      tekor: sql<number>`coalesce(${hariKolektor.tekorLama}, 0)
        + coalesce(greatest(-${serahTerimaKas.selisihSetor}, 0), 0)`.mapWith(Number),
    })
    .from(hariKolektor)
    .leftJoin(
      serahTerimaKas,
      and(eq(serahTerimaKas.hariKolektorId, hariKolektor.id), isNull(serahTerimaKas.dibatalkanAt)),
    )
    .where(
      and(eq(hariKolektor.kolektorId, kolektorId), between(hariKolektor.tanggal, mulai, selesai)),
    );
  const tarif = await db
    .select({
      kolektorId: tarifGaji.kolektorId,
      tarifBp: tarifGaji.tarifBp,
      berlakuMulai: tarifGaji.berlakuMulai,
    })
    .from(tarifGaji)
    .where(
      and(
        eq(tarifGaji.kantorId, aktor.kantorId),
        or(isNull(tarifGaji.kolektorId), eq(tarifGaji.kolektorId, kolektorId)),
      ),
    );

  const perHari = new Map<string, { storting: number; tekor: number }>();
  for (const s of storting) perHari.set(s.tanggal, { storting: s.storting, tekor: 0 });
  for (const t of tekor) {
    if (t.tekor === 0) continue;
    const h = perHari.get(t.tanggal) ?? { storting: 0, tekor: 0 };
    perHari.set(t.tanggal, { ...h, tekor: t.tekor });
  }
  const hari = [...perHari.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([tanggal, h]) => ({
      tanggal,
      ...h,
      tarifBp: tarifBerlaku(tarif, kolektorId, tanggal),
    }));
  return {
    hari,
    gajiKotor: gajiKotor(hari),
    potonganTekor: hari.reduce((s, h) => s + h.tekor, 0),
  };
}

const kolektor = pengguna;
export const pilihSlip = (db: Db) =>
  db
    .select({
      id: pembayaranGaji.id,
      kolektorId: kolektor.id,
      kolektorNama: kolektor.nama,
      periodeMulai: pembayaranGaji.periodeMulai,
      periodeSelesai: pembayaranGaji.periodeSelesai,
      gajiKotor: pembayaranGaji.gajiKotor,
      potonganTekor: pembayaranGaji.potonganTekor,
      gajiBersih: pembayaranGaji.gajiBersih,
      dariAkun: pembayaranGaji.dariAkun,
      tanggalBayar: pembayaranGaji.tanggalBayar,
      keterangan: pembayaranGaji.keterangan,
      dibuatAt: pembayaranGaji.dibuatAt,
      dibatalkanAt: pembayaranGaji.dibatalkanAt,
      alasanBatal: pembayaranGaji.alasanBatal,
    })
    .from(pembayaranGaji)
    .innerJoin(kolektor, eq(kolektor.id, pembayaranGaji.kolektorId));
export const keSlip = ({
  kolektorId,
  kolektorNama,
  dibuatAt,
  dibatalkanAt,
  ...s
}: Awaited<ReturnType<ReturnType<typeof pilihSlip>["execute"]>>[number]) => ({
  ...s,
  kolektor: { id: kolektorId, nama: kolektorNama },
  dibuatAt: dibuatAt.toISOString(),
  dibatalkanAt: iso(dibatalkanAt),
});
