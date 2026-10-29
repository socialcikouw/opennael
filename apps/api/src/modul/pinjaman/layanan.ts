import type { KartuPinjaman, RincianPinjaman } from "@opennael/contracts";
import {
  ATURAN_MACET,
  awalJendelaMacet,
  type BarisRem,
  gabungRem,
  geserTanggal,
  mulaiDitagih,
  nilaiMacet,
  posisiTagih,
  tanggalMasukPembukuan,
} from "@opennael/domain";
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  notInArray,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../../platform/db/klien";
import {
  kebijakan,
  liburNasabah,
  nasabah,
  pengguna,
  pinjaman,
  riwayatStatusPinjaman,
  transaksi,
  wilayah,
} from "../../platform/db/skema";
import type { Aktor } from "../../platform/http/aktor";
import { dilarang, melanggar, tidakDitemukan } from "../../platform/http/galat";
import { wajibPeran } from "../../platform/http/peran";
import { catatRiwayat } from "../../platform/riwayat";
import { bacaKalender, hariTagihAntara } from "../lapangan/gerbang";
import { keKartu, kolomKartu, kolomRem } from "../lapangan/layanan";

/**
 * PINJAMAN — kartu & rincian (bos, pengawas: semua; kolektor: pegangannya),
 * sunting nomor urut (bos), garis waktu status (bos, pengawas).
 * Posisi tagih = aturan-usaha B5; aturan macet = F. Docs: schema-pinjaman.md.
 */
export interface PinjamanDeps {
  db: Db;
  sekarang?: () => Date;
}

const BATAS_DAFTAR = 500;
const AKTIF = ["berjalan", "macet"] as const;
const pemegang = alias(pengguna, "pemegang");
const pencair = alias(pengguna, "pencair");

const kolom = {
  ...kolomKartu,
  kolektorId: pemegang.id,
  kolektorNama: pemegang.nama,
  tanggalSelesai: pinjaman.tanggalSelesai,
  tanggalDisalin: pinjaman.tanggalDisalin,
  saldoAwal: pinjaman.saldoAwal,
};

function pilih(db: Db) {
  return db
    .select(kolom)
    .from(pinjaman)
    .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
    .innerJoin(wilayah, eq(wilayah.id, nasabah.wilayahId))
    .innerJoin(pemegang, eq(pemegang.id, nasabah.kolektorId));
}

type Baris = Awaited<ReturnType<ReturnType<typeof pilih>["execute"]>>[number];

const aktif = (status: string) => (AKTIF as readonly string[]).includes(status);

export function buatLayananPinjaman(deps: PinjamanDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());

  /** Kolektor hanya boleh membaca pegangannya. */
  function bolehBaca(aktor: Aktor, kolektorId: string) {
    if (aktor.peran === "kolektor" && kolektorId !== aktor.penggunaId) {
      throw dilarang("BUKAN_PEGANGAN_ANDA", "Nasabah ini dipegang kolektor lain");
    }
  }

  /** Baris → kartu: posisi tagih (B5) & kunci gulung untuk yang aktif. */
  async function keKartuSemua(db: Db, kantorId: string, baris: Baris[]): Promise<KartuPinjaman[]> {
    const { tanggal: hariIni } = await bacaKalender(db, kantorId, sekarang());
    const kemarin = geserTanggal(hariIni, -1);
    const berjalan = baris.filter((b) => aktif(b.status));

    // Hari tagih kantor s/d kemarin sejak mulai ditagih paling awal (harian).
    // Tanggal teks YYYY-MM-DD: urut leksikal = urut waktu.
    const [mulaiTerawal] = berjalan
      .filter((b) => b.jenis === "harian")
      .map((b) => mulaiDitagih(b))
      .sort();
    const hariTagih = mulaiTerawal
      ? await hariTagihAntara(db, kantorId, mulaiTerawal, kemarin)
      : [];
    const ids = berjalan.map((b) => b.id);
    const libur = new Map<string, number>();
    const rem: BarisRem[] = [];
    if (ids.length > 0) {
      const hitung = await db
        .select({ pinjamanId: liburNasabah.pinjamanId, banyak: count() })
        .from(liburNasabah)
        .where(and(inArray(liburNasabah.pinjamanId, ids), lt(liburNasabah.tanggal, hariIni)))
        .groupBy(liburNasabah.pinjamanId);
      for (const h of hitung) libur.set(h.pinjamanId, h.banyak);
      rem.push(
        ...(await db.select(kolomRem).from(kebijakan).where(eq(kebijakan.kantorId, kantorId))),
      );
    }

    return baris.map((b) => {
      const { kolektorId, kolektorNama, tanggalSelesai, tanggalDisalin, saldoAwal, ...k } = b;
      const kartu = {
        ...keKartu(k),
        kolektor: { id: kolektorId, nama: kolektorNama },
        tanggalSelesai,
      };
      if (!aktif(b.status)) return { ...kartu, tagih: null, kunciGulung: null };
      const mulai = mulaiDitagih(b);
      const r = gabungRem(rem, { kolektorId, nasabahId: b.nasabahId });
      return {
        ...kartu,
        tagih: posisiTagih(
          {
            ...b,
            tanggalDisalin,
            saldoAwal,
            hariTagihLewat: b.jenis === "harian" ? hariTagih.filter((t) => t >= mulai).length : 0,
            liburLewat: libur.get(b.id) ?? 0,
          },
          hariIni,
        ),
        kunciGulung: {
          gulung: r.gulung,
          naik: r.naik,
          alasan: r.gulung ? r.alasan("gulung") : r.naik ? r.alasan("naik") : null,
        },
      };
    });
  }

  /** Aturan macet (F) dengan jendela 30 hari yang berakhir hari ini. */
  async function aturanMacet(
    db: Db,
    kantorId: string,
    p: {
      id: string;
      jenis: Baris["jenis"];
      status: "berjalan" | "macet";
      angsuran: number;
      tanggalAkad: string;
      tanggalDisalin: string | null;
      jatuhTempo: string | null;
    },
  ): Promise<RincianPinjaman["aturanMacet"]> {
    const { tanggal: hariIni } = await bacaKalender(db, kantorId, sekarang());
    const awal = awalJendelaMacet(hariIni);
    const [s] = await db
      .select({ murni: sql<number>`coalesce(sum(${transaksi.setoranMurni}), 0)`.mapWith(Number) })
      .from(transaksi)
      .where(
        and(
          eq(transaksi.pinjamanId, p.id),
          between(transaksi.tanggal, awal, hariIni),
          isNull(transaksi.dibatalkanAt),
        ),
      );
    const setoranJendela = s?.murni ?? 0;
    const mulai = mulaiDitagih(p);
    const hariTagih =
      p.jenis === "harian"
        ? (await hariTagihAntara(db, kantorId, [mulai, awal].sort()[1] ?? awal, hariIni)).length
        : null;
    const hasil = nilaiMacet(
      {
        jenis: p.jenis,
        status: p.status,
        angsuran: p.angsuran,
        tanggalMasuk: tanggalMasukPembukuan(p),
        jatuhTempo: p.jatuhTempo,
        hariTagih: hariTagih ?? 0,
        setoranMurni: setoranJendela,
      },
      hariIni,
    );
    const batasTempoan =
      p.jenis === "tempoan"
        ? geserTanggal(p.jatuhTempo ?? p.tanggalAkad, ATURAN_MACET.tempoan.tenggangHari)
        : null;
    return {
      jendelaAwal: awal,
      jendelaAkhir: hariIni,
      setoranJendela,
      ambang:
        p.jenis === "harian"
          ? p.angsuran * ATURAN_MACET.harian.ambangAngsuran
          : p.jenis === "mingguan"
            ? p.angsuran * ATURAN_MACET.mingguan.ambangAngsuran
            : null,
      hariTagih,
      batasTempoan,
      dievaluasi: hasil.dievaluasi,
      statusMalamIni: hasil.status,
    };
  }

  async function rincian(db: Db, aktor: Aktor, id: string): Promise<RincianPinjaman> {
    const [b] = await pilih(db).where(
      and(eq(pinjaman.id, id), eq(pinjaman.kantorId, aktor.kantorId)),
    );
    if (!b) throw tidakDitemukan("PINJAMAN_TIDAK_DITEMUKAN", "Pinjaman tidak ditemukan");
    bolehBaca(aktor, b.kolektorId);
    const [kartu] = await keKartuSemua(db, aktor.kantorId, [b]);
    const [x] = await db
      .select({
        pencairId: pencair.id,
        pencairNama: pencair.nama,
        tanggalMacet: pinjaman.tanggalMacet,
        pinjamanAsalId: pinjaman.pinjamanAsalId,
        jenisGulung: pinjaman.jenisGulung,
        saldoLama: pinjaman.saldoLama,
        dropBaru: pinjaman.dropBaru,
        dropGulung: pinjaman.dropGulung,
        pokokBerkurang: pinjaman.pokokBerkurang,
        fotoSerahTerimaId: pinjaman.fotoSerahTerimaId,
        diputihkanAt: pinjaman.diputihkanAt,
        alasanPemutihan: pinjaman.alasanPemutihan,
        keteranganPemutihan: pinjaman.keteranganPemutihan,
        dibatalkanAt: pinjaman.dibatalkanAt,
        alasanBatal: pinjaman.alasanBatal,
      })
      .from(pinjaman)
      .innerJoin(pencair, eq(pencair.id, pinjaman.pencairId))
      .where(eq(pinjaman.id, id));
    if (!kartu || !x) throw new Error("pinjaman hilang");
    return {
      ...kartu,
      pencair: { id: x.pencairId, nama: x.pencairNama },
      tanggalDisalin: b.tanggalDisalin,
      tanggalMacet: x.tanggalMacet,
      pinjamanAsalId: x.pinjamanAsalId,
      jenisGulung: x.jenisGulung,
      saldoLama: x.saldoLama,
      saldoAwal: b.saldoAwal,
      dropBaru: x.dropBaru,
      dropGulung: x.dropGulung,
      pokokBerkurang: x.pokokBerkurang,
      fotoSerahTerimaId: x.fotoSerahTerimaId,
      pemutihan:
        x.diputihkanAt && x.alasanPemutihan
          ? {
              at: x.diputihkanAt.toISOString(),
              alasan: x.alasanPemutihan,
              keterangan: x.keteranganPemutihan,
            }
          : null,
      batal:
        x.dibatalkanAt && x.alasanBatal
          ? { at: x.dibatalkanAt.toISOString(), alasan: x.alasanBatal }
          : null,
      aturanMacet: aktif(b.status)
        ? await aturanMacet(db, aktor.kantorId, {
            ...b,
            status: b.status as "berjalan" | "macet",
          })
        : null,
    };
  }

  return {
    /** Kartu pinjaman, urut nama nasabah lalu `pinjamanKe` menurun (paling banyak 500). */
    async daftar(
      aktor: Aktor,
      saring: { status: "aktif" | "selesai" | "semua"; nasabahId?: string; kolektorId?: string },
    ): Promise<KartuPinjaman[]> {
      wajibPeran(aktor, "bos", "pengawas", "kolektor");
      let kolektorId = saring.kolektorId;
      if (aktor.peran === "kolektor") {
        if (kolektorId && kolektorId !== aktor.penggunaId) {
          throw dilarang("BUKAN_MILIK_ANDA", "Anda hanya bisa melihat pegangan Anda sendiri");
        }
        kolektorId = aktor.penggunaId;
      }
      const baris = await pilih(deps.db)
        .where(
          and(
            eq(pinjaman.kantorId, aktor.kantorId),
            saring.status === "aktif" ? inArray(pinjaman.status, [...AKTIF]) : undefined,
            saring.status === "selesai" ? notInArray(pinjaman.status, [...AKTIF]) : undefined,
            saring.nasabahId ? eq(pinjaman.nasabahId, saring.nasabahId) : undefined,
            kolektorId ? eq(nasabah.kolektorId, kolektorId) : undefined,
          ),
        )
        .orderBy(asc(nasabah.nama), desc(pinjaman.pinjamanKe))
        .limit(BATAS_DAFTAR);
      return keKartuSemua(deps.db, aktor.kantorId, baris);
    },

    /** Satu pinjaman: kartu + kolom akad lengkap + aturan macet hari ini. */
    async satu(aktor: Aktor, id: string) {
      wajibPeran(aktor, "bos", "pengawas", "kolektor");
      return rincian(deps.db, aktor, id);
    },

    /** Sunting nomor urut pinjaman (bos) — tercatat di riwayat. */
    async ubah(aktor: Aktor, id: string, input: { pinjamanKe: number }) {
      wajibPeran(aktor, "bos");
      return deps.db.transaction(async (tx) => {
        const [p] = await tx
          .select({ pinjamanKe: pinjaman.pinjamanKe, status: pinjaman.status })
          .from(pinjaman)
          .where(and(eq(pinjaman.id, id), eq(pinjaman.kantorId, aktor.kantorId)))
          .for("update");
        if (!p) throw tidakDitemukan("PINJAMAN_TIDAK_DITEMUKAN", "Pinjaman tidak ditemukan");
        if (p.status === "batal") {
          throw melanggar("PINJAMAN_BATAL", "Pinjaman yang dibatalkan tidak bisa disunting");
        }
        if (p.pinjamanKe === input.pinjamanKe) {
          throw melanggar("TIDAK_ADA_PERUBAHAN", "Nomor pinjaman sudah sama");
        }
        await tx.update(pinjaman).set({ pinjamanKe: input.pinjamanKe }).where(eq(pinjaman.id, id));
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "pinjaman",
          barisId: id,
          aksi: "ubah_pinjaman_ke",
          sebelum: { pinjamanKe: p.pinjamanKe },
          sesudah: { pinjamanKe: input.pinjamanKe },
          pelakuId: aktor.penggunaId,
        });
        return rincian(tx, aktor, id);
      });
    },

    /** Garis waktu status satu pinjaman, urut kejadian (bos, pengawas). */
    async riwayatStatus(aktor: Aktor, id: string) {
      wajibPeran(aktor, "bos", "pengawas");
      const [p] = await deps.db
        .select({ id: pinjaman.id })
        .from(pinjaman)
        .where(and(eq(pinjaman.id, id), eq(pinjaman.kantorId, aktor.kantorId)));
      if (!p) throw tidakDitemukan("PINJAMAN_TIDAK_DITEMUKAN", "Pinjaman tidak ditemukan");
      const baris = await deps.db
        .select({
          id: riwayatStatusPinjaman.id,
          statusSebelum: riwayatStatusPinjaman.statusSebelum,
          statusSesudah: riwayatStatusPinjaman.statusSesudah,
          tanggal: riwayatStatusPinjaman.tanggal,
          dibuatAt: riwayatStatusPinjaman.dibuatAt,
        })
        .from(riwayatStatusPinjaman)
        .where(eq(riwayatStatusPinjaman.pinjamanId, id))
        .orderBy(asc(riwayatStatusPinjaman.dibuatAt));
      return baris.map((r) => ({ ...r, dibuatAt: r.dibuatAt.toISOString() }));
    },
  };
}

export type LayananPinjaman = ReturnType<typeof buatLayananPinjaman>;
