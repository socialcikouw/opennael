import {
  dalamJamKerja,
  geserTanggal,
  hariKerjaPekan,
  hariTagihKantor,
  waktuKantor,
} from "@opennael/domain";
import { and, between, desc, eq, lte } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { kantor, liburKantor, pekanKerja } from "../../../platform/db/skema";

export interface KalenderHari {
  /** Tanggal pembukuan kantor hari ini. */
  tanggal: string;
  dalamJamKerja: boolean;
  hariKerja: boolean;
  /** Alasan libur kantor hari ini, bila libur. */
  liburKantor: string | null;
}

/**
 * Pemeriksaan kalender gerbang lapangan (C4) yang dijalankan. `false` hanya di
 * pengembangan (`.env` `VALIDASI_*`): pemeriksaan itu dianggap lolos.
 */
export interface ValidasiKalender {
  jamKerja: boolean;
  hariKerja: boolean;
  liburKantor: boolean;
}

export const VALIDASI_PENUH: ValidasiKalender = {
  jamKerja: true,
  hariKerja: true,
  liburKantor: true,
};

/**
 * Kalender sebagaimana dilihat gerbang lapangan & HP kolektor. Hanya untuk
 * gerbang — hari tagih, macet, dan tanggal pembukuan memakai `bacaKalender`.
 */
export function kalenderGerbang(kal: KalenderHari, v: ValidasiKalender): KalenderHari {
  return {
    ...kal,
    dalamJamKerja: kal.dalamJamKerja || !v.jamKerja,
    hariKerja: kal.hariKerja || !v.hariKerja,
    liburKantor: v.liburKantor ? kal.liburKantor : null,
  };
}

/** Kalender kantor pada saat `sekarang`: tanggal, jam kerja, pekan kerja bertanggal, libur. */
export async function bacaKalender(
  db: Db,
  kantorId: string,
  sekarang: Date,
): Promise<KalenderHari> {
  const [k] = await db
    .select({ zona: kantor.zonaWaktu, jamBuka: kantor.jamBuka, jamTutup: kantor.jamTutup })
    .from(kantor)
    .where(eq(kantor.id, kantorId))
    .limit(1);
  if (!k) throw new Error("kantor tidak ditemukan");
  const w = waktuKantor(sekarang, k.zona);
  const [pola] = await db
    .select({ hariKerja: pekanKerja.hariKerja })
    .from(pekanKerja)
    .where(and(eq(pekanKerja.kantorId, kantorId), lte(pekanKerja.berlakuMulai, w.tanggal)))
    .orderBy(desc(pekanKerja.berlakuMulai))
    .limit(1);
  const [libur] = await db
    .select({ alasan: liburKantor.alasanLibur })
    .from(liburKantor)
    .where(and(eq(liburKantor.kantorId, kantorId), eq(liburKantor.tanggal, w.tanggal)))
    .limit(1);
  return {
    tanggal: w.tanggal,
    dalamJamKerja: dalamJamKerja(w.menit, k.jamBuka, k.jamTutup),
    hariKerja: pola ? hariKerjaPekan(pola.hariKerja, w.hariPekan) : false,
    liburKantor: libur?.alasan ?? null,
  };
}

/**
 * Hari tagih kantor (aturan-usaha B2) dari `awal` s/d `akhir` (ikut), urut —
 * pola pekan bertanggal & libur kantor. Dipakai sapuan macet dan posisi tagih.
 */
export async function hariTagihAntara(
  db: Db,
  kantorId: string,
  awal: string,
  akhir: string,
): Promise<string[]> {
  if (awal > akhir) return [];
  const pola = await db
    .select({ berlakuMulai: pekanKerja.berlakuMulai, hariKerja: pekanKerja.hariKerja })
    .from(pekanKerja)
    .where(eq(pekanKerja.kantorId, kantorId));
  const libur = await db
    .select({ tanggal: liburKantor.tanggal })
    .from(liburKantor)
    .where(and(eq(liburKantor.kantorId, kantorId), between(liburKantor.tanggal, awal, akhir)));
  const setLibur = new Set(libur.map((l) => l.tanggal));
  const hari: string[] = [];
  for (let t = awal; t <= akhir; t = geserTanggal(t, 1)) {
    if (hariTagihKantor(t, pola, setLibur)) hari.push(t);
  }
  return hari;
}
