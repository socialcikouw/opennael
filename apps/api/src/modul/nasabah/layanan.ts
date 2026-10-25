import type { LokasiRumahInput, NasabahJawaban, UbahNasabahInput } from "@opennael/contracts";
import { kunciWilayah, samarkanNik } from "@opennael/domain";
import { and, asc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../../db/klien";
import { nasabah, penarikanTabungan, pengguna, pinjaman, transaksi, wilayah } from "../../db/skema";
import { dilarang, melanggar, tidakDitemukan } from "../../galat";
import { wajibPeran } from "../../peran";
import { catatRiwayat } from "../../riwayat";
import type { Aktor } from "../auth/token";
import { pastikanWilayah } from "../lapangan/layanan";

/**
 * KELOLA NASABAH — daftar & cari (bos, pengawas: semua; kolektor: pegangannya;
 * kasir: nama & kampung), sunting identitas & pindah pemegang (bos), titik
 * rumah (bos / kolektor pemegang). Perubahan identitas, pemegang, dan titik
 * rumah tercatat di `riwayat_perubahan` (NIK tersamar di jejak).
 * Docs: schema-nasabah.md.
 */
export interface NasabahDeps {
  db: Db;
}

const BATAS_DAFTAR = 200;
const BATAS_SERUPA = 10;
const kolektor = alias(pengguna, "pemegang");
const aktif = alias(pinjaman, "pinjaman_aktif");

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

function pilih(db: Db) {
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

type Baris = Awaited<ReturnType<ReturnType<typeof pilih>["execute"]>>[number];

/** Bentuk jawaban menurut peran pembaca — kasir nama & kampung; NIK tersamar selain bos. */
function keJawaban(aktor: Aktor, b: Baris): NasabahJawaban {
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

export function buatLayananNasabah(deps: NasabahDeps) {
  async function satu(db: Db, aktor: Aktor, id: string) {
    const [b] = await pilih(db).where(
      and(eq(nasabah.id, id), eq(nasabah.kantorId, aktor.kantorId)),
    );
    if (!b) throw tidakDitemukan("NASABAH_TIDAK_DITEMUKAN", "Nasabah tidak ditemukan");
    return b;
  }

  async function kunci(tx: Db, aktor: Aktor, id: string) {
    const [n] = await tx
      .select()
      .from(nasabah)
      .where(and(eq(nasabah.id, id), eq(nasabah.kantorId, aktor.kantorId)))
      .for("update");
    if (!n) throw tidakDitemukan("NASABAH_TIDAK_DITEMUKAN", "Nasabah tidak ditemukan");
    return n;
  }

  return {
    /** Satu nasabah (bos, pengawas; kolektor: pegangannya) — dipakai Buku nasabah. */
    async baca(aktor: Aktor, id: string): Promise<NasabahJawaban> {
      wajibPeran(aktor, "bos", "pengawas", "kolektor");
      const b = await satu(deps.db, aktor, id);
      if (aktor.peran === "kolektor" && b.kolektorId !== aktor.penggunaId) {
        throw dilarang("BUKAN_PEGANGAN_ANDA", "Nasabah ini dipegang kolektor lain");
      }
      return keJawaban(aktor, b);
    },

    /** Daftar & cari nasabah, urut nama (paling banyak 200). */
    async daftar(aktor: Aktor, saring: { cari?: string; kolektorId?: string; bebas?: "ya" }) {
      let kolektorId = saring.kolektorId;
      if (aktor.peran === "kolektor") {
        if (kolektorId && kolektorId !== aktor.penggunaId) {
          throw dilarang("BUKAN_MILIK_ANDA", "Anda hanya bisa melihat pegangan Anda sendiri");
        }
        kolektorId = aktor.penggunaId;
      }
      const cari = saring.cari?.replace(/[\\%_]/g, (c) => `\\${c}`);
      const baris = await pilih(deps.db)
        .where(
          and(
            eq(nasabah.kantorId, aktor.kantorId),
            kolektorId ? eq(nasabah.kolektorId, kolektorId) : undefined,
            cari ? ilike(nasabah.nama, `%${cari}%`) : undefined,
            saring.bebas === "ya" ? and(isNull(nasabah.diblokirAt), isNull(aktif.id)) : undefined,
          ),
        )
        .orderBy(asc(nasabah.nama))
        .limit(BATAS_DAFTAR);
      return baris.map((b) => keJawaban(aktor, b));
    },

    /** Sunting identitas (bos) — kolom yang berubah tercatat di riwayat. */
    async ubah(aktor: Aktor, id: string, input: UbahNasabahInput) {
      wajibPeran(aktor, "bos");
      return deps.db.transaction(async (tx) => {
        const n = await kunci(tx, aktor, id);
        const baru = {
          nama: input.nama,
          wilayahId: input.kampung ? await pastikanWilayah(tx, aktor, input.kampung) : undefined,
          nomorHp: input.nomorHp,
          nik: input.nik,
        };
        const sebelum: Record<string, unknown> = {};
        const sesudah: Record<string, unknown> = {};
        for (const k of ["nama", "wilayahId", "nomorHp", "nik"] as const) {
          if (baru[k] !== undefined && baru[k] !== n[k]) {
            // NIK di jejak disimpan tersamar.
            const jejak = (v: string | null) => (k === "nik" && v ? samarkanNik(v) : v);
            sebelum[k] = jejak(n[k]);
            sesudah[k] = jejak(baru[k] ?? null);
          }
        }
        if (Object.keys(sesudah).length > 0) {
          const ubahan = Object.fromEntries(
            Object.keys(sesudah).map((k) => [k, baru[k as keyof typeof baru]]),
          );
          await tx.update(nasabah).set(ubahan).where(eq(nasabah.id, id));
          await catatRiwayat(tx, {
            kantorId: aktor.kantorId,
            tabel: "nasabah",
            barisId: id,
            aksi: "perbaiki_nasabah",
            sebelum,
            sesudah,
            pelakuId: aktor.penggunaId,
          });
        }
        return keJawaban(aktor, await satu(tx, aktor, id));
      });
    },

    /** Pindah pemegang (bos) — pinjaman aktif dikunci supaya tak berbalapan dengan setoran. */
    async pindah(aktor: Aktor, id: string, input: { kolektorId: string }) {
      wajibPeran(aktor, "bos");
      return deps.db.transaction(async (tx) => {
        const n = await kunci(tx, aktor, id);
        await tx
          .select({ id: pinjaman.id })
          .from(pinjaman)
          .where(and(eq(pinjaman.nasabahId, id), inArray(pinjaman.status, ["berjalan", "macet"])))
          .for("update");
        const [k] = await tx
          .select({ dinonaktifkanAt: pengguna.dinonaktifkanAt })
          .from(pengguna)
          .where(
            and(eq(pengguna.id, input.kolektorId), eq(pengguna.kolektorKantorId, aktor.kantorId)),
          );
        if (!k) throw tidakDitemukan("KOLEKTOR_TIDAK_DITEMUKAN", "Kolektor tidak ditemukan");
        if (k.dinonaktifkanAt) throw melanggar("KOLEKTOR_NONAKTIF", "Kolektor tujuan nonaktif");
        if (n.kolektorId === input.kolektorId) {
          throw melanggar("TIDAK_ADA_PERUBAHAN", "Nasabah sudah dipegang kolektor ini");
        }
        await tx.update(nasabah).set({ kolektorId: input.kolektorId }).where(eq(nasabah.id, id));
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "nasabah",
          barisId: id,
          aksi: "pindah_pemegang",
          sebelum: { kolektorId: n.kolektorId },
          sesudah: { kolektorId: input.kolektorId },
          pelakuId: aktor.penggunaId,
        });
        return keJawaban(aktor, await satu(tx, aktor, id));
      });
    },

    /** Rekam titik rumah (bos / kolektor pemegang) — nilai lama tercatat di riwayat. */
    async rekamLokasi(aktor: Aktor, id: string, input: LokasiRumahInput) {
      wajibPeran(aktor, "bos", "kolektor");
      return deps.db.transaction(async (tx) => {
        const n = await kunci(tx, aktor, id);
        if (aktor.peran === "kolektor" && n.kolektorId !== aktor.penggunaId) {
          throw dilarang("BUKAN_PEGANGAN_ANDA", "Nasabah ini dipegang kolektor lain");
        }
        await tx
          .update(nasabah)
          .set({
            latitude: input.latitude,
            longitude: input.longitude,
            akurasiMeter: input.akurasiMeter,
          })
          .where(eq(nasabah.id, id));
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "nasabah",
          barisId: id,
          aksi: "rekam_lokasi",
          sebelum: { latitude: n.latitude, longitude: n.longitude, akurasiMeter: n.akurasiMeter },
          sesudah: input,
          pelakuId: aktor.penggunaId,
        });
        return keJawaban(aktor, await satu(tx, aktor, id));
      });
    },

    /**
     * "Mungkin nasabah lama?" sebelum akad (bos, kolektor): NIK sama, atau
     * nama mirip (di kampung yang sama bila disebut). Paling banyak 10.
     */
    async serupa(aktor: Aktor, saring: { nama: string; kampung?: string; nik?: string }) {
      wajibPeran(aktor, "bos", "kolektor");
      const kolom = {
        id: nasabah.id,
        nama: nasabah.nama,
        kampung: wilayah.nama,
        kolektorId: kolektor.id,
        kolektorNama: kolektor.nama,
        diblokirAt: nasabah.diblokirAt,
        pinjamanId: aktif.id,
      };
      const dasar = () =>
        deps.db
          .select(kolom)
          .from(nasabah)
          .innerJoin(wilayah, eq(wilayah.id, nasabah.wilayahId))
          .innerJoin(kolektor, eq(kolektor.id, nasabah.kolektorId))
          .leftJoin(
            aktif,
            and(eq(aktif.nasabahId, nasabah.id), inArray(aktif.status, ["berjalan", "macet"])),
          );
      const lewatNik = saring.nik
        ? await dasar().where(
            and(eq(nasabah.kantorId, aktor.kantorId), eq(nasabah.nik, saring.nik)),
          )
        : [];
      const cari = saring.nama.replace(/[\\%_]/g, (c) => `\\${c}`);
      const lewatNama = await dasar()
        .where(
          and(
            eq(nasabah.kantorId, aktor.kantorId),
            ilike(nasabah.nama, `%${cari}%`),
            saring.kampung ? eq(wilayah.kunci, kunciWilayah(saring.kampung)) : undefined,
          ),
        )
        .orderBy(asc(nasabah.nama))
        .limit(BATAS_SERUPA);
      const ke = (b: (typeof lewatNama)[number], cocok: "nik" | "nama") => ({
        id: b.id,
        nama: b.nama,
        kampung: b.kampung,
        kolektor: { id: b.kolektorId, nama: b.kolektorNama },
        cocok,
        diblokir: b.diblokirAt !== null,
        punyaPinjamanAktif: b.pinjamanId !== null,
      });
      const hasil = lewatNik.map((b) => ke(b, "nik"));
      for (const b of lewatNama) {
        if (!hasil.some((h) => h.id === b.id)) hasil.push(ke(b, "nama"));
      }
      return hasil.slice(0, BATAS_SERUPA);
    },

    /**
     * Neraca nasabah (bos, pengawas) — bahan menimbang pemutihan: uang keluar
     * ke nasabah vs uang dari kantongnya, tabungan, piutang.
     */
    async neraca(aktor: Aktor, id: string) {
      wajibPeran(aktor, "bos", "pengawas");
      const n = await satu(deps.db, aktor, id);
      const [p] = await deps.db
        .select({
          jumlah: sql<number>`count(*) filter (where ${pinjaman.status} <> 'batal')`.mapWith(
            Number,
          ),
          pencairan:
            sql<number>`coalesce(sum(${pinjaman.pencairan}) filter (where ${pinjaman.status} <> 'batal'), 0)`.mapWith(
              Number,
            ),
          aktif:
            sql<number>`coalesce(sum(${pinjaman.saldo}) filter (where ${pinjaman.status} in ('berjalan', 'macet')), 0)`.mapWith(
              Number,
            ),
          diputihkan:
            sql<number>`coalesce(sum(${pinjaman.saldo}) filter (where ${pinjaman.status} = 'diputihkan'), 0)`.mapWith(
              Number,
            ),
        })
        .from(pinjaman)
        .where(eq(pinjaman.nasabahId, id));
      const [t] = await deps.db
        .select({
          // Uang lebih pada angsuran dibayar nasabah; pada pelunasan & gulung tidak.
          setoran: sql<number>`coalesce(sum(${transaksi.setoranMurni}
            + CASE WHEN ${transaksi.jenis} = 'angsuran' THEN ${transaksi.setoranPelunasan} ELSE 0 END), 0)`.mapWith(
            Number,
          ),
          // D2: tabungan melebihi saldo saat lunas diserahkan tunai.
          sisaTabungan:
            sql<number>`coalesce(sum(greatest(${transaksi.tabunganKeluar} - ${transaksi.setoranPelunasan}, 0))
            filter (where ${transaksi.jenis} = 'pelunasan'), 0)`.mapWith(Number),
        })
        .from(transaksi)
        .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
        .where(and(eq(pinjaman.nasabahId, id), isNull(transaksi.dibatalkanAt)));
      const [tarik] = await deps.db
        .select({
          nominal: sql<number>`coalesce(sum(${penarikanTabungan.nominal}), 0)`.mapWith(Number),
        })
        .from(penarikanTabungan)
        .where(and(eq(penarikanTabungan.nasabahId, id), isNull(penarikanTabungan.dibatalkanAt)));
      const totalPencairan = p?.pencairan ?? 0;
      const totalSetoran = t?.setoran ?? 0;
      const tabunganDikembalikan = (t?.sisaTabungan ?? 0) + (tarik?.nominal ?? 0);
      const piutangAktif = p?.aktif ?? 0;
      return {
        nasabah: { id: n.id, nama: n.nama },
        jumlahPinjaman: p?.jumlah ?? 0,
        totalPencairan,
        tabunganDikembalikan,
        totalSetoran,
        arusKas: totalSetoran - totalPencairan - tabunganDikembalikan,
        tabungan: n.saldoTabungan,
        piutangAktif,
        piutangDiputihkan: p?.diputihkan ?? 0,
        neraca: n.saldoTabungan - piutangAktif,
      };
    },
  };
}

export type LayananNasabah = ReturnType<typeof buatLayananNasabah>;
