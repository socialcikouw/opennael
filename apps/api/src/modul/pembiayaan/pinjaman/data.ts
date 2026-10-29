import type { PinjamanKartu } from "@opennael/contracts";
import { and, eq, ne, sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { nasabah, pinjaman, wilayah } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { dilarang, melanggar, tidakDitemukan } from "../../../platform/http/galat";

export const kolomKartu = {
  id: pinjaman.id,
  nasabahId: nasabah.id,
  nasabahNama: nasabah.nama,
  kampung: wilayah.nama,
  pinjamanKe: pinjaman.pinjamanKe,
  jenis: pinjaman.jenis,
  tenor: pinjaman.tenor,
  asal: pinjaman.asal,
  status: pinjaman.status,
  tanggalAkad: pinjaman.tanggalAkad,
  jatuhTempo: pinjaman.jatuhTempo,
  pokok: pinjaman.pokok,
  potonganAdmin: pinjaman.potonganAdmin,
  tabunganMasuk: pinjaman.tabunganMasuk,
  pencairan: pinjaman.pencairan,
  totalKembali: pinjaman.totalKembali,
  angsuran: pinjaman.angsuran,
  saldo: pinjaman.saldo,
  angsuranKe: pinjaman.angsuranKe,
  fotoSerahTerimaId: pinjaman.fotoSerahTerimaId,
  dropBaru: pinjaman.dropBaru,
  dropGulung: pinjaman.dropGulung,
  jenisGulung: pinjaman.jenisGulung,
};

export function keKartu<T extends { nasabahId: string; nasabahNama: string; kampung: string }>(
  b: T,
): PinjamanKartu {
  const { nasabahId, nasabahNama, kampung, ...p } = b;
  return {
    ...(p as unknown as Omit<PinjamanKartu, "nasabah">),
    nasabah: { id: nasabahId, nama: nasabahNama, kampung },
  };
}

export async function kartu(db: Db, pinjamanId: string): Promise<PinjamanKartu> {
  const [b] = await db
    .select(kolomKartu)
    .from(pinjaman)
    .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
    .innerJoin(wilayah, eq(wilayah.id, nasabah.wilayahId))
    .where(eq(pinjaman.id, pinjamanId))
    .limit(1);
  if (!b) throw new Error("pinjaman tidak ditemukan");
  return keKartu(b);
}

export async function kunciPinjaman(tx: Db, aktor: Aktor, pinjamanId: string) {
  const [p] = await tx
    .select({
      id: pinjaman.id,
      nasabahId: pinjaman.nasabahId,
      pemegang: nasabah.kolektorId,
      jenis: pinjaman.jenis,
      status: pinjaman.status,
      pokok: pinjaman.pokok,
      saldo: pinjaman.saldo,
      totalKembali: pinjaman.totalKembali,
      angsuran: pinjaman.angsuran,
      pinjamanKe: pinjaman.pinjamanKe,
      tanggalAkad: pinjaman.tanggalAkad,
      tabungan: nasabah.saldoTabungan,
    })
    .from(pinjaman)
    .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
    .where(and(eq(pinjaman.id, pinjamanId), eq(pinjaman.kantorId, aktor.kantorId)))
    .for("update")
    .limit(1);
  if (!p) throw tidakDitemukan("PINJAMAN_TIDAK_DITEMUKAN", "Pinjaman tidak ditemukan");
  if (p.pemegang !== aktor.penggunaId) {
    throw dilarang("BUKAN_PEGANGAN_ANDA", "Nasabah ini dipegang kolektor lain");
  }
  if (p.status !== "berjalan" && p.status !== "macet") {
    throw melanggar("PINJAMAN_SUDAH_SELESAI", "Pinjaman ini sudah selesai");
  }
  return p;
}

export async function pinjamanKeBerikut(tx: Db, nasabahId: string): Promise<number> {
  const [r] = await tx
    .select({ maks: sql<number>`coalesce(max(${pinjaman.pinjamanKe}), 0)::int` })
    .from(pinjaman)
    .where(and(eq(pinjaman.nasabahId, nasabahId), ne(pinjaman.status, "batal")));
  return (r?.maks ?? 0) + 1;
}
