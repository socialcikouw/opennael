import type { NasabahJawaban } from "@opennael/contracts";
import { samarkanNik } from "@opennael/domain";
import { and, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../../../platform/db/klien";
import { nasabah, pengguna, pinjaman, wilayah } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { tidakDitemukan } from "../../../platform/http/galat";

/** Pembantu privat NASABAH: kolom pilihan, pemeta jawaban menurut peran, dan kunci baris. */

export const BATAS_DAFTAR = 200;
export const BATAS_SERUPA = 10;
export const kolektor = alias(pengguna, "pemegang");
export const aktif = alias(pinjaman, "pinjaman_aktif");

const kolom = {
  id: nasabah.id,
  nama: nasabah.nama,
  kampungId: wilayah.id,
  kampungNama: wilayah.nama,
  kolektorId: kolektor.id,
  kolektorNama: kolektor.nama,
  nomorHp: nasabah.nomorHp,
  nik: nasabah.nik,
  saldoTabungan: nasabah.saldoTabungan,
  diblokirAt: nasabah.diblokirAt,
  latitude: nasabah.latitude,
  longitude: nasabah.longitude,
  akurasiMeter: nasabah.akurasiMeter,
  pinjamanId: aktif.id,
  pinjamanStatus: aktif.status,
  pinjamanSaldo: aktif.saldo,
};

export function pilih(db: Db) {
  return db
    .select(kolom)
    .from(nasabah)
    .innerJoin(wilayah, eq(wilayah.id, nasabah.wilayahId))
    .innerJoin(kolektor, eq(kolektor.id, nasabah.kolektorId))
    .leftJoin(
      aktif,
      and(eq(aktif.nasabahId, nasabah.id), inArray(aktif.status, ["berjalan", "macet"])),
    );
}

export type Baris = Awaited<ReturnType<ReturnType<typeof pilih>["execute"]>>[number];

/** Bentuk jawaban menurut peran pembaca — kasir nama & kampung; NIK tersamar selain bos. */
export function keJawaban(aktor: Aktor, b: Baris): NasabahJawaban {
  const kampung = { id: b.kampungId, nama: b.kampungNama };
  if (aktor.peran === "kasir") {
    return {
      id: b.id,
      nama: b.nama,
      kampung,
      kolektor: null,
      nomorHp: null,
      nik: null,
      saldoTabungan: null,
      diblokir: null,
      pinjamanAktif: null,
      lokasi: null,
    };
  }
  return {
    id: b.id,
    nama: b.nama,
    kampung,
    kolektor: { id: b.kolektorId, nama: b.kolektorNama },
    nomorHp: b.nomorHp,
    nik: b.nik && aktor.peran !== "bos" ? samarkanNik(b.nik) : b.nik,
    saldoTabungan: b.saldoTabungan,
    diblokir: b.diblokirAt !== null,
    pinjamanAktif:
      b.pinjamanId && b.pinjamanSaldo !== null
        ? {
            id: b.pinjamanId,
            status: b.pinjamanStatus as "berjalan" | "macet",
            saldo: b.pinjamanSaldo,
          }
        : null,
    lokasi:
      b.latitude !== null && b.longitude !== null && b.akurasiMeter !== null
        ? { latitude: b.latitude, longitude: b.longitude, akurasiMeter: b.akurasiMeter }
        : null,
  };
}

export async function satu(db: Db, aktor: Aktor, id: string) {
  const [b] = await pilih(db).where(and(eq(nasabah.id, id), eq(nasabah.kantorId, aktor.kantorId)));
  if (!b) throw tidakDitemukan("NASABAH_TIDAK_DITEMUKAN", "Nasabah tidak ditemukan");
  return b;
}

export async function kunci(tx: Db, aktor: Aktor, id: string) {
  const [n] = await tx
    .select()
    .from(nasabah)
    .where(and(eq(nasabah.id, id), eq(nasabah.kantorId, aktor.kantorId)))
    .for("update");
  if (!n) throw tidakDitemukan("NASABAH_TIDAK_DITEMUKAN", "Nasabah tidak ditemukan");
  return n;
}
