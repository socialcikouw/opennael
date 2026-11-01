import type { JenisPerforma } from "@opennael/contracts";
import {
  type BahanPatokan,
  gabungPerforma,
  geserTanggal,
  hitungPerforma,
  type PerpindahanStatus,
  patokanJatuhTagih,
  persentasePerforma,
  selisihHari,
} from "@opennael/domain";
import { and, asc, between, eq, gte, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import {
  biayaTakTerduga,
  hariKolektor,
  nasabah,
  pengguna,
  pinjaman,
  posisiHarian,
  riwayatStatusPinjaman,
  serahTerimaKas,
  transaksi,
  transferSetoran,
} from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { dilarang, melanggar } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { bacaKalender } from "../../kantor";

/**
 * RINGKASAN — angka satu rentang tanggal (penagihan, akad, kas lapangan),
 * per kolektor, dan deret performa penagihan harian (aturan-usaha N). Semua
 * dari catatan berlaku. Bos & pengawas: semua kolektor; kolektor: dirinya.
 */
export interface RingkasanDeps {
  db: Db;
  sekarang?: () => Date;
}

/** Deret performa paling panjang ±1 tahun. */
const RENTANG_PERFORMA_MAKS = 366;

const jumlah = <T>(nilai: T) => sql<number>`coalesce(sum(${nilai}), 0)`.mapWith(Number);
const banyak = () => sql<number>`count(*)`.mapWith(Number);

export function buatLayananRingkasan(deps: RingkasanDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const hariIni = async (aktor: Aktor) =>
    (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal;

  async function saring(
    aktor: Aktor,
    s: { mulai?: string; selesai?: string; kolektorId?: string },
  ) {
    wajibPeran(aktor, "bos", "pengawas", "kolektor");
    let kolektorId = s.kolektorId;
    if (aktor.peran === "kolektor") {
      if (kolektorId && kolektorId !== aktor.penggunaId) {
        throw dilarang("BUKAN_MILIK_ANDA", "Anda hanya bisa melihat angka Anda sendiri");
      }
      kolektorId = aktor.penggunaId;
    }
    const hari = await hariIni(aktor);
    const mulai = s.mulai ?? hari;
    const selesai = s.selesai ?? (s.mulai ? mulai : hari);
    if (mulai > selesai)
      throw melanggar("RENTANG_TIDAK_SAH", "Tanggal mulai sesudah tanggal selesai");
    return { kolektorId, mulai, selesai };
  }

  /** Angka satu rentang untuk kantor atau satu kolektor. */
  async function angka(aktor: Aktor, mulai: string, selesai: string, kolektorId?: string) {
    const db = deps.db;
    const [setoran] = await db
      .select({
        jumlahSetoran: banyak(),
        setoranMurni: jumlah(transaksi.setoranMurni),
        setoranPelunasan: jumlah(transaksi.setoranPelunasan),
        tabunganKeluar: jumlah(transaksi.tabunganKeluar),
        storting: jumlah(transaksi.storting),
      })
      .from(transaksi)
      .where(
        and(
          eq(transaksi.kantorId, aktor.kantorId),
          between(transaksi.tanggal, mulai, selesai),
          isNull(transaksi.dibatalkanAt),
          kolektorId ? eq(transaksi.pencatatId, kolektorId) : undefined,
        ),
      );
    const [akad] = await db
      .select({
        jumlahAkad: banyak(),
        droping: jumlah(pinjaman.droping),
        dropBaru: jumlah(pinjaman.dropBaru),
        dropGulung: jumlah(pinjaman.dropGulung),
        pokokBerkurang: jumlah(pinjaman.pokokBerkurang),
        potonganAdmin: jumlah(pinjaman.potonganAdmin),
        tabunganMasuk: jumlah(pinjaman.tabunganMasuk),
        pencairan: jumlah(pinjaman.pencairan),
      })
      .from(pinjaman)
      .where(
        and(
          eq(pinjaman.kantorId, aktor.kantorId),
          between(pinjaman.tanggalAkad, mulai, selesai),
          isNull(pinjaman.dibatalkanAt),
          ne(pinjaman.asal, "migrasi"),
          kolektorId ? eq(pinjaman.pencairId, kolektorId) : undefined,
        ),
      );
    const hariSaring = and(
      eq(hariKolektor.kantorId, aktor.kantorId),
      between(hariKolektor.tanggal, mulai, selesai),
      kolektorId ? eq(hariKolektor.kolektorId, kolektorId) : undefined,
    );
    const [hari] = await db
      .select({
        hariKerja:
          sql<number>`count(*) filter (where ${hariKolektor.absensi} = 'masuk_kerja')`.mapWith(
            Number,
          ),
        kasLapangan: jumlah(hariKolektor.kasLapangan),
        uangJalan: jumlah(hariKolektor.uangJalan),
        transferLama: jumlah(hariKolektor.transferLama),
        tekorLama: jumlah(hariKolektor.tekorLama),
      })
      .from(hariKolektor)
      .where(hariSaring);
    const [serah] = await db
      .select({
        tunaiDiterima: jumlah(serahTerimaKas.tunaiDiterima),
        tekor: jumlah(sql`greatest(-${serahTerimaKas.selisihSetor}, 0)`),
        lebihSetor: jumlah(sql`greatest(${serahTerimaKas.selisihSetor}, 0)`),
      })
      .from(serahTerimaKas)
      .innerJoin(hariKolektor, eq(hariKolektor.id, serahTerimaKas.hariKolektorId))
      .where(and(hariSaring, isNull(serahTerimaKas.dibatalkanAt)));
    const [transfer] = await db
      .select({ transfer: jumlah(transferSetoran.nominal) })
      .from(transferSetoran)
      .innerJoin(transaksi, eq(transaksi.id, transferSetoran.transaksiId))
      .where(
        and(
          eq(transferSetoran.kantorId, aktor.kantorId),
          isNull(transferSetoran.dibatalkanAt),
          isNull(transaksi.dibatalkanAt),
          between(transaksi.tanggal, mulai, selesai),
          kolektorId ? eq(transaksi.pencatatId, kolektorId) : undefined,
        ),
      );
    const [biaya] = await db
      .select({ biaya: jumlah(biayaTakTerduga.nominal) })
      .from(biayaTakTerduga)
      .where(
        and(
          eq(biayaTakTerduga.kantorId, aktor.kantorId),
          between(biayaTakTerduga.tanggal, mulai, selesai),
          isNull(biayaTakTerduga.dibatalkanAt),
          kolektorId ? eq(biayaTakTerduga.kolektorId, kolektorId) : undefined,
        ),
      );
    if (!setoran || !akad || !hari || !serah || !transfer || !biaya)
      throw new Error("agregat kosong");
    return {
      penagihan: setoran,
      akad,
      kasLapangan: {
        hariKerja: hari.hariKerja,
        kasLapangan: hari.kasLapangan,
        uangJalan: hari.uangJalan,
        transfer: hari.transferLama + transfer.transfer,
        biayaTakTerduga: biaya.biaya,
        tunaiDiterima: serah.tunaiDiterima,
        tekor: hari.tekorLama + serah.tekor,
        lebihSetor: serah.lebihSetor,
      },
    };
  }

  /** Setoran murni per tanggal untuk satu jenis (catatan berlaku, menurut pencatat). */
  async function setoranMurniPer(
    aktor: Aktor,
    jenis: "harian" | "mingguan" | "tempoan",
    kolektorId: string | undefined,
    mulai: string,
    selesai: string,
  ) {
    const baris = await deps.db
      .select({ tanggal: transaksi.tanggal, murni: jumlah(transaksi.setoranMurni) })
      .from(transaksi)
      .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
      .where(
        and(
          eq(transaksi.kantorId, aktor.kantorId),
          between(transaksi.tanggal, mulai, selesai),
          isNull(transaksi.dibatalkanAt),
          eq(pinjaman.jenis, jenis),
          kolektorId ? eq(transaksi.pencatatId, kolektorId) : undefined,
        ),
      )
      .groupBy(transaksi.tanggal);
    return new Map(baris.map((b) => [b.tanggal as string, b.murni]));
  }

  /** Deret harian N1: patokan dari potret kemarin dikurangi angsuran yang mati hari itu. */
  async function performaHarian(
    aktor: Aktor,
    kolektorId: string | undefined,
    mulai: string,
    selesai: string,
  ) {
    const murniPer = await setoranMurniPer(aktor, "harian", kolektorId, mulai, selesai);
    const potret = await deps.db
      .select({ tanggal: posisiHarian.tanggal, angsuran: jumlah(posisiHarian.angsuranBerjalan) })
      .from(posisiHarian)
      .where(
        and(
          eq(posisiHarian.kantorId, aktor.kantorId),
          eq(posisiHarian.jenis, "harian"),
          between(posisiHarian.tanggal, geserTanggal(mulai, -1), geserTanggal(selesai, -1)),
          kolektorId ? eq(posisiHarian.kolektorId, kolektorId) : undefined,
        ),
      )
      .groupBy(posisiHarian.tanggal);
    const mati = await deps.db
      .select({ tanggal: pinjaman.tanggalSelesai, angsuran: jumlah(pinjaman.angsuran) })
      .from(pinjaman)
      .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
      .where(
        and(
          eq(pinjaman.kantorId, aktor.kantorId),
          eq(pinjaman.jenis, "harian"),
          inArray(pinjaman.status, ["lunas", "digulung", "diputihkan"]),
          between(pinjaman.tanggalSelesai, mulai, selesai),
          kolektorId ? eq(nasabah.kolektorId, kolektorId) : undefined,
        ),
      )
      .groupBy(pinjaman.tanggalSelesai);

    const peta = <T extends { tanggal: string | null }>(b: T[], f: (x: T) => number) =>
      new Map(b.map((x) => [x.tanggal as string, f(x)]));
    const potretPer = peta(potret, (x) => x.angsuran);
    const matiPer = peta(mati, (x) => x.angsuran);
    const deret = [];
    for (let t = mulai; t <= selesai; t = geserTanggal(t, 1)) {
      const setoranMurni = murniPer.get(t) ?? 0;
      const kemarin = potretPer.get(geserTanggal(t, -1)) ?? null;
      deret.push({
        tanggal: t,
        setoranMurni,
        ...hitungPerforma(setoranMurni, kemarin, matiPer.get(t) ?? 0),
      });
    }
    return deret;
  }

  /**
   * Deret mingguan & tempoan N3: patokan = angsuran yang jatuh tagih pada hari itu
   * (berjalan pada akhir kemarin, tidak berakhir digulung/diputihkan hari itu).
   * Status akhir kemarin dari `riwayat_status_pinjaman`, bukan potret.
   */
  async function performaPeriodik(
    aktor: Aktor,
    jenis: "mingguan" | "tempoan",
    kolektorId: string | undefined,
    mulai: string,
    selesai: string,
  ) {
    const murniPer = await setoranMurniPer(aktor, jenis, kolektorId, mulai, selesai);
    // Yang relevan: lahir sebelum hari terakhir dan belum selesai sebelum hari pertama.
    const kondisi = and(
      eq(pinjaman.kantorId, aktor.kantorId),
      eq(pinjaman.jenis, jenis),
      kolektorId ? eq(nasabah.kolektorId, kolektorId) : undefined,
      lt(pinjaman.tanggalAkad, selesai),
      or(isNull(pinjaman.tanggalSelesai), gte(pinjaman.tanggalSelesai, mulai)),
    );
    const pinjamanRelevan = await deps.db
      .select({
        id: pinjaman.id,
        angsuran: pinjaman.angsuran,
        tanggalAkad: pinjaman.tanggalAkad,
        tenor: pinjaman.tenor,
        jatuhTempo: pinjaman.jatuhTempo,
        status: pinjaman.status,
        tanggalSelesai: pinjaman.tanggalSelesai,
      })
      .from(pinjaman)
      .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
      .where(kondisi);
    const perpindahan = await deps.db
      .select({
        pinjamanId: riwayatStatusPinjaman.pinjamanId,
        tanggal: riwayatStatusPinjaman.tanggal,
        sesudah: riwayatStatusPinjaman.statusSesudah,
      })
      .from(riwayatStatusPinjaman)
      .where(
        inArray(
          riwayatStatusPinjaman.pinjamanId,
          deps.db
            .select({ id: pinjaman.id })
            .from(pinjaman)
            .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
            .where(kondisi),
        ),
      )
      .orderBy(asc(riwayatStatusPinjaman.dibuatAt));
    const riwayatPer = new Map<string, PerpindahanStatus[]>();
    for (const r of perpindahan) {
      const daftar = riwayatPer.get(r.pinjamanId) ?? [];
      daftar.push({ tanggal: r.tanggal, sesudah: r.sesudah });
      riwayatPer.set(r.pinjamanId, daftar);
    }
    const bahan: BahanPatokan[] = pinjamanRelevan.map((p) => ({
      jenis,
      angsuran: p.angsuran,
      tanggalAkad: p.tanggalAkad,
      tenor: p.tenor,
      jatuhTempo: p.jatuhTempo,
      status: p.status,
      tanggalSelesai: p.tanggalSelesai,
      riwayat: riwayatPer.get(p.id) ?? [],
    }));

    const deret = [];
    for (let t = mulai; t <= selesai; t = geserTanggal(t, 1)) {
      const setoranMurni = murniPer.get(t) ?? 0;
      const patokan = patokanJatuhTagih(bahan, t);
      deret.push({
        tanggal: t,
        setoranMurni,
        patokan,
        persentase: persentasePerforma(setoranMurni, patokan),
      });
    }
    return deret;
  }

  return {
    /** Angka satu rentang — kantor, atau satu kolektor. */
    async ringkasan(aktor: Aktor, s: { mulai?: string; selesai?: string; kolektorId?: string }) {
      const { kolektorId, mulai, selesai } = await saring(aktor, s);
      return { mulai, selesai, ...(await angka(aktor, mulai, selesai, kolektorId)) };
    },

    /** Angka satu rentang per kolektor (bos, pengawas). */
    async perKolektor(aktor: Aktor, s: { mulai?: string; selesai?: string }) {
      wajibPeran(aktor, "bos", "pengawas");
      const { mulai, selesai } = await saring(aktor, s);
      const kolektor = await deps.db
        .select({ id: pengguna.id, nama: pengguna.nama })
        .from(pengguna)
        .where(eq(pengguna.kolektorKantorId, aktor.kantorId))
        .orderBy(asc(pengguna.nama));
      return Promise.all(
        kolektor.map(async (k) => ({ kolektor: k, ...(await angka(aktor, mulai, selesai, k.id)) })),
      );
    },

    /**
     * Deret performa penagihan harian (aturan-usaha N) — paling panjang 366 hari.
     * `jenis`: harian (bawaan, N1), mingguan · tempoan (N3), semua (N4).
     */
    async performa(
      aktor: Aktor,
      s: { mulai?: string; selesai?: string; kolektorId?: string; jenis?: JenisPerforma },
    ) {
      const { kolektorId, mulai, selesai } = await saring(aktor, s);
      if (selisihHari(mulai, selesai) >= RENTANG_PERFORMA_MAKS) {
        throw melanggar("RENTANG_TERLALU_PANJANG", `Paling panjang ${RENTANG_PERFORMA_MAKS} hari`);
      }
      const jenis = s.jenis ?? "harian";
      if (jenis === "harian") return performaHarian(aktor, kolektorId, mulai, selesai);
      if (jenis === "semua") {
        // N4: ketiga deret mencakup tanggal yang sama, jadi sejajar menurut indeks.
        const harian = await performaHarian(aktor, kolektorId, mulai, selesai);
        const mingguan = await performaPeriodik(aktor, "mingguan", kolektorId, mulai, selesai);
        const tempoan = await performaPeriodik(aktor, "tempoan", kolektorId, mulai, selesai);
        return harian.map((h, i) => {
          const lain = [mingguan[i], tempoan[i]].flatMap((x) => (x ? [x] : []));
          return { tanggal: h.tanggal, ...gabungPerforma([h, ...lain]) };
        });
      }
      return performaPeriodik(aktor, jenis, kolektorId, mulai, selesai);
    },
  };
}

export type LayananRingkasan = ReturnType<typeof buatLayananRingkasan>;
