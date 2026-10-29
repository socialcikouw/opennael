import type { BatalInput, BayarGajiInput } from "@opennael/contracts";
import { GalatAturan, gajiBersih, gajiKotor, tarifBerlaku } from "@opennael/domain";
import { and, between, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import type { Db } from "../../platform/db/klien";
import {
  bukuKas,
  hariKolektor,
  pembayaranGaji,
  pengguna,
  serahTerimaKas,
  tarifGaji,
  transaksi,
} from "../../platform/db/skema";
import type { Aktor } from "../../platform/http/aktor";
import {
  batalHanyaHariIni,
  bentrok,
  bukuKasBelumDibuka,
  dilarang,
  melanggar,
  sudahDibatalkan,
  tidakDitemukan,
} from "../../platform/http/galat";
import { wajibPeran } from "../../platform/http/peran";
import { bacaKalender } from "../lapangan/gerbang";

/**
 * GAJI KOLEKTOR — pratinjau & pembayaran memakai SATU perhitungan (aturan-
 * usaha J): storting per hari × tarif yang berlaku hari itu, potongan tekor
 * dari serah terima kas + arsip tekor lama. Hasilnya dibekukan di
 * `pembayaran_gaji`. Docs: schema-pembayaran-gaji.md, schema-tarif-gaji.md.
 */
export interface GajiDeps {
  db: Db;
  sekarang?: () => Date;
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

export function buatLayananGaji(deps: GajiDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const hariIni = async (aktor: Aktor) =>
    (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal;

  async function namaKolektor(db: Db, aktor: Aktor, kolektorId: string) {
    const [k] = await db
      .select({ nama: pengguna.nama })
      .from(pengguna)
      .where(and(eq(pengguna.id, kolektorId), eq(pengguna.kolektorKantorId, aktor.kantorId)));
    if (!k) throw tidakDitemukan("KOLEKTOR_TIDAK_DITEMUKAN", "Kolektor tidak ditemukan");
    return k.nama;
  }

  /** Slip berlaku yang periodenya bertumpuk dengan [mulai, selesai]. */
  async function sudahDibayar(db: Db, kolektorId: string, mulai: string, selesai: string) {
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
  async function hitung(db: Db, aktor: Aktor, kolektorId: string, mulai: string, selesai: string) {
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
        and(
          eq(serahTerimaKas.hariKolektorId, hariKolektor.id),
          isNull(serahTerimaKas.dibatalkanAt),
        ),
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
  const pilihSlip = (db: Db) =>
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
  const keSlip = ({
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

  return {
    /** Pratinjau gaji (bos) — angka yang akan dibekukan bila dibayar hari ini. */
    async pratinjau(aktor: Aktor, saring: { kolektorId: string; mulai: string; selesai: string }) {
      wajibPeran(aktor, "bos");
      if (saring.mulai > saring.selesai) {
        throw melanggar("RENTANG_TIDAK_SAH", "Tanggal mulai sesudah tanggal selesai");
      }
      const nama = await namaKolektor(deps.db, aktor, saring.kolektorId);
      const h = await hitung(deps.db, aktor, saring.kolektorId, saring.mulai, saring.selesai);
      let halangan: string | null = null;
      if (saring.selesai >= (await hariIni(aktor))) halangan = "PERIODE_BELUM_BERAKHIR";
      else if (await sudahDibayar(deps.db, saring.kolektorId, saring.mulai, saring.selesai)) {
        halangan = "PERIODE_SUDAH_DIBAYAR";
      } else {
        try {
          gajiBersih(h.gajiKotor, h.potonganTekor);
        } catch (e) {
          if (!(e instanceof GalatAturan)) throw e;
          halangan = e.kode;
        }
      }
      return {
        kolektor: { id: saring.kolektorId, nama },
        periodeMulai: saring.mulai,
        periodeSelesai: saring.selesai,
        ...h,
        gajiBersih: h.gajiKotor - h.potonganTekor,
        halangan: halangan as
          | "PERIODE_BELUM_BERAKHIR"
          | "PERIODE_SUDAH_DIBAYAR"
          | "TEKOR_MELEBIHI_GAJI"
          | "GAJI_KOTOR_MINUS"
          | null,
      };
    },

    /** Bayar gaji (bos) — periode sudah berakhir, belum dibayar; angka dibekukan. */
    async bayar(aktor: Aktor, input: BayarGajiInput) {
      wajibPeran(aktor, "bos");
      const tanggal = await hariIni(aktor);
      if (input.periodeMulai > input.periodeSelesai) {
        throw melanggar("RENTANG_TIDAK_SAH", "Tanggal mulai sesudah tanggal selesai");
      }
      if (input.periodeSelesai >= tanggal) {
        throw melanggar(
          "PERIODE_BELUM_BERAKHIR",
          "Gaji hanya dibayar untuk periode yang sudah berakhir",
        );
      }
      await namaKolektor(deps.db, aktor, input.kolektorId);
      return deps.db.transaction(async (tx) => {
        const [buku] = await tx
          .select({ id: bukuKas.kantorId })
          .from(bukuKas)
          .where(eq(bukuKas.kantorId, aktor.kantorId));
        if (!buku) throw bukuKasBelumDibuka();
        if (await sudahDibayar(tx, input.kolektorId, input.periodeMulai, input.periodeSelesai)) {
          throw bentrok("PERIODE_SUDAH_DIBAYAR", "Sebagian periode ini sudah dibayar");
        }
        const h = await hitung(
          tx,
          aktor,
          input.kolektorId,
          input.periodeMulai,
          input.periodeSelesai,
        );
        gajiBersih(h.gajiKotor, h.potonganTekor);
        const [baru] = await tx
          .insert(pembayaranGaji)
          .values({
            kantorId: aktor.kantorId,
            kolektorId: input.kolektorId,
            periodeMulai: input.periodeMulai,
            periodeSelesai: input.periodeSelesai,
            gajiKotor: h.gajiKotor,
            potonganTekor: h.potonganTekor,
            dariAkun: input.dariAkun,
            tanggalBayar: tanggal,
            keterangan: input.keterangan ?? null,
            dibuatOleh: aktor.penggunaId,
          })
          .returning({ id: pembayaranGaji.id });
        if (!baru) throw new Error("gaji tak tersimpan");
        const [slip] = await pilihSlip(tx).where(eq(pembayaranGaji.id, baru.id));
        if (!slip) throw new Error("slip hilang");
        return keSlip(slip);
      });
    },

    /** Batal pembayaran gaji (bos, hari yang sama) — periodenya bisa dibayar ulang. */
    async batal(aktor: Aktor, id: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      const tanggal = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const [g] = await tx
          .select({
            tanggalBayar: pembayaranGaji.tanggalBayar,
            dibatalkanAt: pembayaranGaji.dibatalkanAt,
          })
          .from(pembayaranGaji)
          .where(and(eq(pembayaranGaji.id, id), eq(pembayaranGaji.kantorId, aktor.kantorId)))
          .for("update");
        if (!g) throw tidakDitemukan("GAJI_TIDAK_DITEMUKAN", "Pembayaran gaji tidak ditemukan");
        if (g.dibatalkanAt) throw sudahDibatalkan();
        if (g.tanggalBayar !== tanggal) throw batalHanyaHariIni();
        await tx
          .update(pembayaranGaji)
          .set({
            dibatalkanAt: sekarang(),
            dibatalkanOleh: aktor.penggunaId,
            alasanBatal: input.alasan,
          })
          .where(eq(pembayaranGaji.id, id));
        const [slip] = await pilihSlip(tx).where(eq(pembayaranGaji.id, id));
        if (!slip) throw new Error("slip hilang");
        return keSlip(slip);
      });
    },

    /** Riwayat slip — bos & pengawas: semua; kolektor: miliknya. */
    async daftar(aktor: Aktor, saring: { kolektorId?: string }) {
      wajibPeran(aktor, "bos", "pengawas", "kolektor");
      let kolektorId = saring.kolektorId;
      if (aktor.peran === "kolektor") {
        if (kolektorId && kolektorId !== aktor.penggunaId) {
          throw dilarang("BUKAN_MILIK_ANDA", "Anda hanya bisa melihat slip Anda sendiri");
        }
        kolektorId = aktor.penggunaId;
      }
      const baris = await pilihSlip(deps.db)
        .where(
          and(
            eq(pembayaranGaji.kantorId, aktor.kantorId),
            kolektorId ? eq(pembayaranGaji.kolektorId, kolektorId) : undefined,
          ),
        )
        .orderBy(desc(pembayaranGaji.periodeMulai), desc(pembayaranGaji.dibuatAt));
      return baris.map(keSlip);
    },
  };
}

export type LayananGaji = ReturnType<typeof buatLayananGaji>;
