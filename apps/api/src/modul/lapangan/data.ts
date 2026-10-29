import type { KartuTagih, NasabahBaruInput, PinjamanKartu } from "@opennael/contracts";
import { gabungRem, kunciWilayah, rapikanNamaWilayah } from "@opennael/domain";
import { and, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import type { Db } from "../../platform/db/klien";
import {
  foto,
  hariKolektor,
  kebijakan,
  liburNasabah,
  nasabah,
  pinjaman,
  transaksi,
  wilayah,
} from "../../platform/db/skema";
import type { Aktor } from "../../platform/http/aktor";
import { bentrok, dilarang, melanggar, tidakDitemukan } from "../../platform/http/galat";
import type { ValidasiKalender } from "./gerbang";

export const UMUR_FOTO_MS = 60 * 60 * 1000;

export interface LapanganDeps {
  db: Db;
  sekarang?: () => Date;
  /** Bawaan: semua pemeriksaan kalender gerbang dijalankan. */
  validasiKalender?: ValidasiKalender;
}

export type Tx = Db;

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

export const kolomRem = {
  kolektorId: kebijakan.kolektorId,
  nasabahId: kebijakan.nasabahId,
  pinjamanBaru: kebijakan.pinjamanBaruDikunci,
  naik: kebijakan.naikPinjamanDikunci,
  gulung: kebijakan.gulungPinjamanDikunci,
  alasan: kebijakan.alasanKunci,
};

export async function remBerlaku(db: Db, aktor: Aktor, nasabahId: string | null) {
  const baris = await db
    .select(kolomRem)
    .from(kebijakan)
    .where(
      and(
        eq(kebijakan.kantorId, aktor.kantorId),
        or(
          and(isNull(kebijakan.kolektorId), isNull(kebijakan.nasabahId)),
          eq(kebijakan.kolektorId, aktor.penggunaId),
          nasabahId ? eq(kebijakan.nasabahId, nasabahId) : sql`false`,
        ),
      ),
    );
  return gabungRem(baris, { kolektorId: aktor.penggunaId, nasabahId });
}

export async function pastikanFoto(tx: Tx, aktor: Aktor, fotoId: string, kini: Date) {
  const [f] = await tx
    .select({ jenis: foto.jenis, oleh: foto.diunggahOleh, dibuatAt: foto.dibuatAt })
    .from(foto)
    .where(and(eq(foto.id, fotoId), eq(foto.kantorId, aktor.kantorId)))
    .limit(1);
  if (!f) throw melanggar("FOTO_TIDAK_DITEMUKAN", "Foto serah terima tidak ditemukan");
  if (f.jenis !== "serah_terima")
    throw melanggar("FOTO_BUKAN_SERAH_TERIMA", "Foto ini bukan foto serah terima");
  if (f.oleh !== aktor.penggunaId) {
    throw melanggar(
      "FOTO_BUKAN_MILIK_ANDA",
      "Foto serah terima harus diambil dari HP Anda sendiri",
    );
  }
  if (kini.getTime() - f.dibuatAt.getTime() > UMUR_FOTO_MS) {
    throw melanggar("FOTO_KEDALUWARSA", "Foto serah terima lebih dari 1 jam — potret ulang");
  }
  const [dipakai] = await tx
    .select({ id: pinjaman.id })
    .from(pinjaman)
    .where(eq(pinjaman.fotoSerahTerimaId, fotoId))
    .limit(1);
  if (dipakai) throw bentrok("FOTO_SUDAH_DIPAKAI", "Foto ini sudah dipakai akad lain");
}

export async function kunciPinjaman(tx: Tx, aktor: Aktor, pinjamanId: string) {
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

export async function pastikanBelumAdaPeristiwa(tx: Tx, pinjamanId: string, tanggal: string) {
  const [t] = await tx
    .select({ id: transaksi.id })
    .from(transaksi)
    .where(
      and(
        eq(transaksi.pinjamanId, pinjamanId),
        eq(transaksi.tanggal, tanggal),
        isNull(transaksi.dibatalkanAt),
      ),
    )
    .limit(1);
  const [l] = await tx
    .select({ id: liburNasabah.id })
    .from(liburNasabah)
    .where(and(eq(liburNasabah.pinjamanId, pinjamanId), eq(liburNasabah.tanggal, tanggal)))
    .limit(1);
  if (t || l) throw bentrok("PERISTIWA_SUDAH_ADA", "Pinjaman ini sudah punya catatan hari ini");
}

export async function pinjamanKeBerikut(tx: Tx, nasabahId: string): Promise<number> {
  const [r] = await tx
    .select({ maks: sql<number>`coalesce(max(${pinjaman.pinjamanKe}), 0)::int` })
    .from(pinjaman)
    .where(and(eq(pinjaman.nasabahId, nasabahId), ne(pinjaman.status, "batal")));
  return (r?.maks ?? 0) + 1;
}

export const kolomTransaksi = {
  id: transaksi.id,
  pinjamanId: transaksi.pinjamanId,
  tanggal: transaksi.tanggal,
  jenis: transaksi.jenis,
  setoranMurni: transaksi.setoranMurni,
  setoranPelunasan: transaksi.setoranPelunasan,
  tabunganKeluar: transaksi.tabunganKeluar,
  storting: transaksi.storting,
  saldoSesudah: transaksi.saldoSesudah,
};

export async function catatanHari(
  db: Db,
  ids: string[],
  tanggal: string,
): Promise<Map<string, KartuTagih["hariIni"]>> {
  const catatan = new Map<string, KartuTagih["hariIni"]>();
  if (ids.length === 0) return catatan;
  const setoran = await db
    .select({ pinjamanId: transaksi.pinjamanId, storting: transaksi.storting })
    .from(transaksi)
    .where(
      and(
        inArray(transaksi.pinjamanId, ids),
        eq(transaksi.tanggal, tanggal),
        isNull(transaksi.dibatalkanAt),
      ),
    );
  const libur = await db
    .select({ pinjamanId: liburNasabah.pinjamanId, alasan: liburNasabah.alasanLibur })
    .from(liburNasabah)
    .where(and(inArray(liburNasabah.pinjamanId, ids), eq(liburNasabah.tanggal, tanggal)));
  for (const t of setoran) catatan.set(t.pinjamanId, { jenis: "angsuran", storting: t.storting });
  for (const l of libur) catatan.set(l.pinjamanId, { jenis: "libur", alasan: l.alasan });
  return catatan;
}

export async function daftarkanNasabahBaru(
  tx: Tx,
  aktor: Aktor,
  baru: NasabahBaruInput,
  kolektorId: string,
): Promise<string> {
  if (baru.nik) {
    const [sama] = await tx
      .select({ diblokirAt: nasabah.diblokirAt })
      .from(nasabah)
      .where(and(eq(nasabah.kantorId, aktor.kantorId), eq(nasabah.nik, baru.nik)))
      .limit(1);
    if (sama) {
      throw sama.diblokirAt
        ? melanggar("NASABAH_DIBLOKIR", "Pemilik NIK ini nasabah yang diblokir")
        : bentrok("NIK_SUDAH_TERDAFTAR", "NIK ini sudah terdaftar — pilih nasabah lamanya");
    }
  }
  const wilayahId = await pastikanWilayah(tx, aktor, baru.kampung);
  const kunciNama = kunciWilayah(baru.nama);
  const [mirip] = await tx
    .select({ nik: nasabah.nik })
    .from(nasabah)
    .where(
      and(
        eq(nasabah.kantorId, aktor.kantorId),
        eq(nasabah.wilayahId, wilayahId),
        sql`lower(btrim(regexp_replace(${nasabah.nama}, '\\s+', ' ', 'g'))) = ${kunciNama}`,
        sql`${nasabah.diblokirAt} IS NOT NULL`,
      ),
    )
    .limit(1);
  if (mirip && !(baru.nik && mirip.nik && mirip.nik !== baru.nik)) {
    throw melanggar(
      "NASABAH_MIRIP_DIBLOKIR",
      "Ada nasabah diblokir dengan nama & kampung yang sama — hubungi bos",
    );
  }
  const [n] = await tx
    .insert(nasabah)
    .values({
      kantorId: aktor.kantorId,
      kolektorId,
      nama: baru.nama,
      wilayahId,
      nik: baru.nik ?? null,
      nomorHp: baru.nomorHp ?? null,
    })
    .returning({ id: nasabah.id });
  if (!n) throw new Error("gagal mencatat nasabah");
  return n.id;
}

export async function pastikanWilayah(
  tx: Tx,
  aktor: Aktor,
  kampung: { wilayahId: string } | { nama: string },
): Promise<string> {
  if ("wilayahId" in kampung) {
    const [w] = await tx
      .select({ id: wilayah.id })
      .from(wilayah)
      .where(and(eq(wilayah.id, kampung.wilayahId), eq(wilayah.kantorId, aktor.kantorId)))
      .limit(1);
    if (!w) throw tidakDitemukan("KAMPUNG_TIDAK_DITEMUKAN", "Kampung tidak ditemukan");
    return w.id;
  }
  const nama = rapikanNamaWilayah(kampung.nama);
  await tx
    .insert(wilayah)
    .values({ kantorId: aktor.kantorId, nama, dibuatOleh: aktor.penggunaId })
    .onConflictDoNothing({ target: [wilayah.kantorId, wilayah.kunci] });
  const [w] = await tx
    .select({ id: wilayah.id })
    .from(wilayah)
    .where(and(eq(wilayah.kantorId, aktor.kantorId), eq(wilayah.kunci, kunciWilayah(nama))))
    .limit(1);
  if (!w) throw new Error("gagal memastikan kampung");
  return w.id;
}

export async function hariIni(db: Db, aktor: Aktor, tanggal: string) {
  const [h] = await db
    .select({
      tanggal: hariKolektor.tanggal,
      absensi: hariKolektor.absensi,
      kasLapangan: hariKolektor.kasLapangan,
      uangJalan: hariKolektor.uangJalan,
      alasanTidakKerja: hariKolektor.alasanTidakKerja,
      laporanDibukaAt: hariKolektor.laporanDibukaAt,
    })
    .from(hariKolektor)
    .where(and(eq(hariKolektor.kolektorId, aktor.penggunaId), eq(hariKolektor.tanggal, tanggal)))
    .limit(1);
  return h ? { ...h, laporanDibukaAt: h.laporanDibukaAt?.toISOString() ?? null } : null;
}
