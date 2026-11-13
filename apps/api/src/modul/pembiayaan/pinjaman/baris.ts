import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../../../platform/db/klien";
import { nasabah, pengguna, pinjaman, wilayah } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { dilarang } from "../../../platform/http/galat";
import { kolomKartu } from "./data";

/** Pembantu privat PINJAMAN (baca): kolom pilihan, baris lengkap, dan hak baca. */

/** Yang dibutuhkan bacaan & operasi: database dan jam. */
export interface Konteks {
  db: Db;
  sekarang: () => Date;
}

export const BATAS_DAFTAR = 500;
export const AKTIF = ["berjalan", "macet"] as const;
export const pemegang = alias(pengguna, "pemegang");
export const pencair = alias(pengguna, "pencair");

const kolom = {
  ...kolomKartu,
  kolektorId: pemegang.id,
  kolektorNama: pemegang.nama,
  tanggalSelesai: pinjaman.tanggalSelesai,
  tanggalDisalin: pinjaman.tanggalDisalin,
  saldoAwal: pinjaman.saldoAwal,
};

export function pilih(db: Db) {
  return db
    .select(kolom)
    .from(pinjaman)
    .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
    .innerJoin(wilayah, eq(wilayah.id, nasabah.wilayahId))
    .innerJoin(pemegang, eq(pemegang.id, nasabah.kolektorId));
}

export type Baris = Awaited<ReturnType<ReturnType<typeof pilih>["execute"]>>[number];

export const aktif = (status: string) => (AKTIF as readonly string[]).includes(status);

/** Kolektor hanya boleh membaca pegangannya. */
export function bolehBaca(aktor: Aktor, kolektorId: string) {
  if (aktor.peran === "kolektor" && kolektorId !== aktor.penggunaId) {
    throw dilarang("BUKAN_PEGANGAN_ANDA", "Nasabah ini dipegang kolektor lain");
  }
}
