import type {
  AbsenInput,
  AkadInput,
  KalenderBulan,
  KartuTagih,
  NasabahBaruInput,
  NasabahLama,
  PinjamanKartu,
} from "@opennael/contracts";
import {
  angsuranKe,
  hitungBayar,
  hitungGulung,
  hitungLunas,
  kunciWilayah,
  rapikanNamaWilayah,
  syaratAkad,
  tolakLibur,
  wajibDitagihHariIni,
} from "@opennael/domain";
import { and, asc, between, desc, eq, inArray, isNull, ne, notExists, or, sql } from "drizzle-orm";
import type { Db } from "../../db/klien";
import {
  foto,
  hariKolektor,
  kebijakan,
  liburKantor,
  liburNasabah,
  nasabah,
  pinjaman,
  ruteWilayah,
  transaksi,
  wilayah,
} from "../../db/skema";
import { bentrok, dilarang, melanggar, tidakDitemukan } from "../../galat";
import { wajibPeran } from "../../peran";
import { gabungRem } from "../../rem";
import type { Aktor } from "../auth/token";
import {
  bacaKalender,
  bukaGerbang,
  hariTagihAntara,
  kalenderGerbang,
  VALIDASI_PENUH,
  type ValidasiKalender,
} from "./gerbang";

/** Foto serah terima hanya sah bila diambil kurang dari 1 jam sebelum akad (A7). */
const UMUR_FOTO_MS = 60 * 60 * 1000;

export interface LapanganDeps {
  db: Db;
  sekarang?: () => Date;
  /** Bawaan: semua pemeriksaan kalender gerbang dijalankan. */
  validasiKalender?: ValidasiKalender;
}

type Tx = Db;

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
};

/** Baris hasil `select(kolomKartu)` → bentuk kartu di kontrak. */
export function keKartu<T extends { nasabahId: string; nasabahNama: string; kampung: string }>(
  b: T,
): PinjamanKartu {
  const { nasabahId, nasabahNama, kampung, ...p } = b;
  return {
    ...(p as unknown as Omit<PinjamanKartu, "nasabah">),
    nasabah: { id: nasabahId, nama: nasabahNama, kampung },
  };
}

async function kartu(db: Db, pinjamanId: string): Promise<PinjamanKartu> {
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

/** Kolom `kebijakan` untuk `gabungRem`. */
export const kolomRem = {
  kolektorId: kebijakan.kolektorId,
  nasabahId: kebijakan.nasabahId,
  pinjamanBaru: kebijakan.pinjamanBaruDikunci,
  naik: kebijakan.naikPinjamanDikunci,
  gulung: kebijakan.gulungPinjamanDikunci,
  alasan: kebijakan.alasanKunci,
};

/** Rem bos yang berlaku untuk kolektor (& nasabah) ini. */
async function remBerlaku(db: Db, aktor: Aktor, nasabahId: string | null) {
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

/** Foto serah terima sah untuk akad/gulung oleh kolektor ini, saat ini (A7). */
async function pastikanFoto(tx: Tx, aktor: Aktor, fotoId: string, kini: Date) {
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

/** Kunci baris pinjaman aktif milik pegangan kolektor ini (`FOR UPDATE`). */
async function kunciPinjaman(tx: Tx, aktor: Aktor, pinjamanId: string) {
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

/** C3. Satu peristiwa per pinjaman per hari. */
async function pastikanBelumAdaPeristiwa(tx: Tx, pinjamanId: string, tanggal: string) {
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

const kolomTransaksi = {
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

/**
 * Catatan hari ini (C3) per pinjaman: setoran (transaksi berlaku — angsuran,
 * lunas, gulung) atau libur. Satu sumber untuk daftar tagih & gerbang laporan.
 */
async function catatanHari(
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

export function buatLayananLapangan(deps: LapanganDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const validasi = deps.validasiKalender ?? VALIDASI_PENUH;

  async function hariIni(aktor: Aktor, tanggal: string, db: Db = deps.db) {
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

  return {
    /** Absen pagi — sekali sehari. */
    async absen(aktor: Aktor, input: AbsenInput) {
      const { tanggal } = await bukaGerbang(deps.db, aktor, sekarang(), {
        perluAbsen: false,
        validasi,
      });
      // Transaksi sendiri: absen ganda ditolak UNIQUE tanpa merusak transaksi pemanggil.
      await deps.db.transaction(async (tx) => {
        await tx.insert(hariKolektor).values({
          kantorId: aktor.kantorId,
          kolektorId: aktor.penggunaId,
          tanggal,
          absensi: input.absensi,
          ...(input.absensi === "masuk_kerja"
            ? { kasLapangan: input.kasLapangan, uangJalan: input.uangJalan }
            : { alasanTidakKerja: input.alasan }),
        });
      });
      const h = await hariIni(aktor, tanggal);
      if (!h) throw new Error("absen tak tersimpan");
      return h;
    },

    /** Keadaan hari ini kolektor (null = belum absen); kalender seperti dilihat gerbang. */
    async keadaanHariIni(aktor: Aktor) {
      wajibPeran(aktor, "kolektor");
      const kal = kalenderGerbang(
        await bacaKalender(deps.db, aktor.kantorId, sekarang()),
        validasi,
      );
      return { kalender: kal, hari: await hariIni(aktor, kal.tanggal) };
    },

    /** Buka laporan — operasi lapangan berhenti hari ini. Mengulang = jawaban sama. */
    async bukaLaporan(aktor: Aktor) {
      wajibPeran(aktor, "kolektor");
      const { tanggal } = await bacaKalender(deps.db, aktor.kantorId, sekarang());
      const h = await hariIni(aktor, tanggal);
      if (!h) throw melanggar("BELUM_ABSEN", "Isi absensi hari ini lebih dulu");
      if (h.absensi !== "masuk_kerja") {
        throw melanggar("TIDAK_KERJA_HARI_INI", "Anda tercatat tidak kerja hari ini");
      }
      // Laporan yang sudah terbuka tetap terbuka (idempoten, tak diperiksa ulang).
      if (h.laporanDibukaAt) return h;

      // C6: semua yang wajib ditagih hari ini (B6) sudah punya catatan.
      const aktif = await deps.db
        .select({
          id: pinjaman.id,
          jenis: pinjaman.jenis,
          tanggalAkad: pinjaman.tanggalAkad,
          nama: nasabah.nama,
        })
        .from(pinjaman)
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .where(
          and(
            eq(nasabah.kolektorId, aktor.penggunaId),
            inArray(pinjaman.status, ["berjalan", "macet"]),
          ),
        )
        .orderBy(asc(nasabah.nama));
      const wajib = aktif.filter((p) => wajibDitagihHariIni(p, tanggal));
      const catatan = await catatanHari(
        deps.db,
        wajib.map((p) => p.id),
        tanggal,
      );
      const sisa = wajib.filter((p) => !catatan.has(p.id));
      if (sisa.length > 0) {
        const nama = sisa.slice(0, 3).map((p) => p.nama);
        throw melanggar(
          "MASIH_ADA_TAGIHAN",
          `Masih ada ${sisa.length} nasabah yang belum dicatat hari ini: ${nama.join(", ")}${sisa.length > 3 ? ", …" : ""}. Catat setoran atau libur dulu.`,
        );
      }

      await deps.db
        .update(hariKolektor)
        .set({ laporanDibukaAt: sekarang() })
        .where(
          and(
            eq(hariKolektor.kolektorId, aktor.penggunaId),
            eq(hariKolektor.tanggal, tanggal),
            isNull(hariKolektor.laporanDibukaAt),
          ),
        );
      const sesudah = await hariIni(aktor, tanggal);
      if (!sesudah) throw new Error("hari kolektor hilang");
      return sesudah;
    },

    /**
     * Pinjaman aktif yang dipegang kolektor ini, urut RUTE-nya (Rute 1 lebih
     * dulu), lalu kampung di luar rute menurut abjad, lalu nama nasabah.
     */
    async daftarPinjaman(aktor: Aktor): Promise<KartuTagih[]> {
      wajibPeran(aktor, "kolektor");
      const { tanggal } = await bacaKalender(deps.db, aktor.kantorId, sekarang());
      const baris = await deps.db
        .select({ ...kolomKartu, tabungan: nasabah.saldoTabungan })
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
      return baris.map(({ tabungan, ...b }) => ({
        ...keKartu(b),
        tabungan,
        hariIni: catatan.get(b.id) ?? null,
      }));
    },

    /** Kalender kantor sebulan (grid setoran kartu): hari tagih B2 & libur kantor. */
    async kalenderBulan(aktor: Aktor, bulan: string): Promise<KalenderBulan> {
      wajibPeran(aktor, "kolektor", "pengawas", "bos");
      const awal = `${bulan}-01`;
      const [tahun = 0, nomorBulan = 0] = bulan.split("-").map(Number);
      const akhir = new Date(Date.UTC(tahun, nomorBulan, 0)).toISOString().slice(0, 10);
      const [hariTagih, libur] = await Promise.all([
        hariTagihAntara(deps.db, aktor.kantorId, awal, akhir),
        deps.db
          .select({ tanggal: liburKantor.tanggal, alasan: liburKantor.alasanLibur })
          .from(liburKantor)
          .where(
            and(
              eq(liburKantor.kantorId, aktor.kantorId),
              between(liburKantor.tanggal, awal, akhir),
            ),
          )
          .orderBy(asc(liburKantor.tanggal)),
      ]);
      return { hariTagih, liburKantor: libur };
    },

    /** Kampung kantor ini untuk formulir akad, urut nama. */
    /** Kampung kantor — pilihan formulir akad (kolektor) & salinan migrasi (bos). */
    async daftarKampung(aktor: Aktor) {
      wajibPeran(aktor, "kolektor", "bos");
      return deps.db
        .select({ id: wilayah.id, nama: wilayah.nama })
        .from(wilayah)
        .where(eq(wilayah.kantorId, aktor.kantorId))
        .orderBy(asc(wilayah.nama));
    },

    /** Pegangan kolektor ini yang tidak diblokir & tanpa pinjaman aktif — calon pinjam lagi. */
    async daftarNasabahLama(aktor: Aktor): Promise<NasabahLama[]> {
      wajibPeran(aktor, "kolektor");
      const aktif = deps.db
        .select({ id: pinjaman.id })
        .from(pinjaman)
        .where(
          and(eq(pinjaman.nasabahId, nasabah.id), inArray(pinjaman.status, ["berjalan", "macet"])),
        );
      const baris = await deps.db
        .select({
          id: nasabah.id,
          nama: nasabah.nama,
          kampung: wilayah.nama,
          tabungan: nasabah.saldoTabungan,
        })
        .from(nasabah)
        .innerJoin(wilayah, eq(wilayah.id, nasabah.wilayahId))
        .where(
          and(
            eq(nasabah.kolektorId, aktor.penggunaId),
            isNull(nasabah.diblokirAt),
            notExists(aktif),
          ),
        )
        .orderBy(asc(wilayah.nama), asc(nasabah.nama));
      if (baris.length === 0) return [];

      // Pinjaman terakhir (bukan batal) per nasabah — patokan jenis & pokok pinjam lagi.
      const riwayat = await deps.db
        .selectDistinctOn([pinjaman.nasabahId], {
          nasabahId: pinjaman.nasabahId,
          pinjamanKe: pinjaman.pinjamanKe,
          jenis: pinjaman.jenis,
          pokok: pinjaman.pokok,
        })
        .from(pinjaman)
        .where(
          and(
            inArray(
              pinjaman.nasabahId,
              baris.map((b) => b.id),
            ),
            ne(pinjaman.status, "batal"),
          ),
        )
        .orderBy(pinjaman.nasabahId, desc(pinjaman.pinjamanKe));
      const terakhir = new Map(riwayat.map(({ nasabahId, ...r }) => [nasabahId, r]));
      return baris.map((b) => ({ ...b, terakhir: terakhir.get(b.id) ?? null }));
    },

    /** Akad baru — orang baru, atau nasabah lama pegangan kolektor ini (A). */
    async akad(aktor: Aktor, input: AkadInput): Promise<PinjamanKartu> {
      const { tanggal } = await bukaGerbang(deps.db, aktor, sekarang(), {
        perluAbsen: true,
        validasi,
      });
      const kini = sekarang();
      const syarat = syaratAkad(input.jenis, input.pokok, input.tenor);

      return deps.db.transaction(async (tx) => {
        const rem = await remBerlaku(
          tx,
          aktor,
          "nasabahId" in input.nasabah ? input.nasabah.nasabahId : null,
        );
        if (rem.pinjamanBaru) {
          const alasan = rem.alasan("pinjamanBaru");
          throw melanggar(
            "PINJAMAN_BARU_DIKUNCI",
            alasan ? `Akad baru dikunci bos: ${alasan}` : "Akad baru sedang dikunci bos",
          );
        }

        let nasabahId: string;
        if ("nasabahId" in input.nasabah) {
          const [n] = await tx
            .select({
              id: nasabah.id,
              pemegang: nasabah.kolektorId,
              diblokirAt: nasabah.diblokirAt,
            })
            .from(nasabah)
            .where(
              and(eq(nasabah.id, input.nasabah.nasabahId), eq(nasabah.kantorId, aktor.kantorId)),
            )
            .for("update")
            .limit(1);
          if (!n) throw tidakDitemukan("NASABAH_TIDAK_DITEMUKAN", "Nasabah tidak ditemukan");
          if (n.pemegang !== aktor.penggunaId) {
            throw dilarang("BUKAN_PEGANGAN_ANDA", "Nasabah ini dipegang kolektor lain");
          }
          if (n.diblokirAt) throw melanggar("NASABAH_DIBLOKIR", "Nasabah ini diblokir");
          nasabahId = n.id;
        } else {
          nasabahId = await daftarkanNasabahBaru(tx, aktor, input.nasabah, aktor.penggunaId);
        }

        const [aktif] = await tx
          .select({ id: pinjaman.id })
          .from(pinjaman)
          .where(
            and(eq(pinjaman.nasabahId, nasabahId), inArray(pinjaman.status, ["berjalan", "macet"])),
          )
          .limit(1);
        if (aktif) throw bentrok("PINJAMAN_MASIH_AKTIF", "Nasabah ini masih punya pinjaman aktif");

        await pastikanFoto(tx, aktor, input.fotoSerahTerimaId, kini);

        const [p] = await tx
          .insert(pinjaman)
          .values({
            kantorId: aktor.kantorId,
            pencairId: aktor.penggunaId,
            dibuatOleh: aktor.penggunaId,
            nasabahId,
            pinjamanKe: await pinjamanKeBerikut(tx, nasabahId),
            jenis: syarat.jenis,
            tenor: syarat.tenor,
            asal: "baru",
            fotoSerahTerimaId: input.fotoSerahTerimaId,
            tanggalAkad: tanggal,
            pokok: syarat.pokok,
            potonganAdmin: syarat.potonganAdmin,
            tabunganMasuk: syarat.tabunganMasuk,
            pencairan: syarat.pencairan,
            totalKembali: syarat.totalKembali,
            angsuran: syarat.angsuran,
            saldoAwal: syarat.totalKembali,
            dropBaru: syarat.pokok,
            saldo: syarat.totalKembali,
          })
          .returning({ id: pinjaman.id });
        if (!p) throw new Error("gagal mencatat akad");
        await tx
          .update(nasabah)
          .set({ saldoTabungan: sql`${nasabah.saldoTabungan} + ${syarat.tabunganMasuk}` })
          .where(eq(nasabah.id, nasabahId));
        return kartu(tx, p.id);
      });
    },

    /** Setoran angsuran (C). */
    async bayar(
      aktor: Aktor,
      input: { pinjamanId: string; setoranMurni: number; setoranPelunasan: number },
    ) {
      const { tanggal } = await bukaGerbang(deps.db, aktor, sekarang(), {
        perluAbsen: true,
        validasi,
      });
      return deps.db.transaction(async (tx) => {
        const p = await kunciPinjaman(tx, aktor, input.pinjamanId);
        await pastikanBelumAdaPeristiwa(tx, p.id, tanggal);
        const { sisaSaldo } = hitungBayar(p, input.setoranMurni, input.setoranPelunasan);
        const [t] = await tx
          .insert(transaksi)
          .values({
            kantorId: aktor.kantorId,
            pencatatId: aktor.penggunaId,
            pinjamanId: p.id,
            tanggal,
            jenis: "angsuran",
            setoranMurni: input.setoranMurni,
            setoranPelunasan: input.setoranPelunasan,
            saldoSesudah: sisaSaldo,
          })
          .returning(kolomTransaksi);
        await tx.update(pinjaman).set({ saldo: sisaSaldo }).where(eq(pinjaman.id, p.id));
        if (!t) throw new Error("gagal mencatat setoran");
        return t;
      });
    },

    /** Pelunasan (D): tabungan menutup saldo lebih dulu; seluruh tabungan keluar. */
    async lunas(aktor: Aktor, input: { pinjamanId: string }) {
      const { tanggal } = await bukaGerbang(deps.db, aktor, sekarang(), {
        perluAbsen: true,
        validasi,
      });
      return deps.db.transaction(async (tx) => {
        const p = await kunciPinjaman(tx, aktor, input.pinjamanId);
        await pastikanBelumAdaPeristiwa(tx, p.id, tanggal);
        const l = hitungLunas(p.saldo, p.tabungan);
        const [t] = await tx
          .insert(transaksi)
          .values({
            kantorId: aktor.kantorId,
            pencatatId: aktor.penggunaId,
            pinjamanId: p.id,
            tanggal,
            jenis: "pelunasan",
            setoranMurni: l.setoranMurni,
            setoranPelunasan: l.setoranPelunasan,
            tabunganKeluar: l.tabunganKeluar,
            saldoSesudah: 0,
          })
          .returning(kolomTransaksi);
        await tx
          .update(pinjaman)
          .set({ saldo: 0, status: "lunas", tanggalSelesai: tanggal, tanggalMacet: null })
          .where(eq(pinjaman.id, p.id));
        await tx
          .update(nasabah)
          .set({ saldoTabungan: sql`${nasabah.saldoTabungan} - ${l.tabunganKeluar}` })
          .where(eq(nasabah.id, p.nasabahId));
        if (!t) throw new Error("gagal mencatat pelunasan");
        return t;
      });
    },

    /** Gulung (E): asal dilunasi penerus berjenis sama; sisanya dicairkan. */
    async gulung(
      aktor: Aktor,
      input: { pinjamanId: string; pokok: number; tenor: number; fotoSerahTerimaId: string },
    ) {
      const { tanggal } = await bukaGerbang(deps.db, aktor, sekarang(), {
        perluAbsen: true,
        validasi,
      });
      const kini = sekarang();
      return deps.db.transaction(async (tx) => {
        const asal = await kunciPinjaman(tx, aktor, input.pinjamanId);
        await pastikanBelumAdaPeristiwa(tx, asal.id, tanggal);
        const rem = await remBerlaku(tx, aktor, asal.nasabahId);
        const rencana = hitungGulung(
          { ...asal, angsuranKe: angsuranKe(asal) },
          input.pokok,
          input.tenor,
          {
            gulungDikunci: rem.gulung,
            naikDikunci: rem.naik,
            alasan: rem.gulung ? rem.alasan("gulung") : rem.alasan("naik"),
          },
        );
        await pastikanFoto(tx, aktor, input.fotoSerahTerimaId, kini);

        const [t] = await tx
          .insert(transaksi)
          .values({
            kantorId: aktor.kantorId,
            pencatatId: aktor.penggunaId,
            pinjamanId: asal.id,
            tanggal,
            jenis: "gulung",
            setoranPelunasan: asal.saldo,
            saldoSesudah: 0,
          })
          .returning(kolomTransaksi);
        // Asal ditutup lebih dulu: satu pinjaman aktif per nasabah.
        await tx
          .update(pinjaman)
          .set({ saldo: 0, status: "digulung", tanggalSelesai: tanggal, tanggalMacet: null })
          .where(eq(pinjaman.id, asal.id));
        const s = rencana.syarat;
        const [baru] = await tx
          .insert(pinjaman)
          .values({
            kantorId: aktor.kantorId,
            pencairId: aktor.penggunaId,
            dibuatOleh: aktor.penggunaId,
            nasabahId: asal.nasabahId,
            pinjamanKe: await pinjamanKeBerikut(tx, asal.nasabahId),
            jenis: s.jenis,
            tenor: s.tenor,
            asal: "gulung",
            pinjamanAsalId: asal.id,
            jenisGulung: rencana.jenisGulung,
            fotoSerahTerimaId: input.fotoSerahTerimaId,
            tanggalAkad: tanggal,
            pokok: s.pokok,
            potonganAdmin: s.potonganAdmin,
            tabunganMasuk: s.tabunganMasuk,
            saldoLama: rencana.saldoLama,
            pencairan: rencana.pencairan,
            totalKembali: s.totalKembali,
            angsuran: s.angsuran,
            saldoAwal: s.totalKembali,
            dropBaru: rencana.dropBaru,
            dropGulung: rencana.dropGulung,
            pokokBerkurang: rencana.pokokBerkurang,
            saldo: s.totalKembali,
          })
          .returning({ id: pinjaman.id });
        if (!t || !baru) throw new Error("gagal mencatat gulung");
        await tx
          .update(nasabah)
          .set({ saldoTabungan: sql`${nasabah.saldoTabungan} + ${s.tabunganMasuk}` })
          .where(eq(nasabah.id, asal.nasabahId));
        return { transaksi: t, pinjamanBaru: await kartu(tx, baru.id) };
      });
    },

    /** Libur nasabah (G): pinjaman tidak ditagih hari ini. */
    async libur(aktor: Aktor, input: { pinjamanId: string; alasan?: string | undefined }) {
      const { tanggal } = await bukaGerbang(deps.db, aktor, sekarang(), {
        perluAbsen: true,
        validasi,
      });
      return deps.db.transaction(async (tx) => {
        const p = await kunciPinjaman(tx, aktor, input.pinjamanId);
        await pastikanBelumAdaPeristiwa(tx, p.id, tanggal);
        // G1–G3 — aturan yang sama dengan tombol Libur di HP.
        const tolak = tolakLibur({ ...p, angsuranKe: angsuranKe(p) }, tanggal);
        if (tolak) throw melanggar(tolak.kode, tolak.pesan);
        const [l] = await tx
          .insert(liburNasabah)
          .values({
            kantorId: aktor.kantorId,
            pencatatId: aktor.penggunaId,
            pinjamanId: p.id,
            tanggal,
            alasanLibur: input.alasan ?? null,
          })
          .returning({
            id: liburNasabah.id,
            pinjamanId: liburNasabah.pinjamanId,
            tanggal: liburNasabah.tanggal,
            alasanLibur: liburNasabah.alasanLibur,
          });
        if (!l) throw new Error("gagal mencatat libur");
        return l;
      });
    },
  };
}

/**
 * Daftarkan orang baru bersama akad / salinan pertamanya (A8): NIK belum
 * terdaftar, dan tidak sama nama + kampung dengan nasabah yang diblokir
 * (kecuali keduanya ber-NIK dan berbeda).
 */
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

/** Kampung dipilih (harus milik kantor) atau diketik (dibuat bila belum ada). */
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

export type LayananLapangan = ReturnType<typeof buatLayananLapangan>;
