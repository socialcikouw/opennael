import type { BatalInput } from "@opennael/contracts";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { Db } from "../../db/klien";
import {
  liburNasabah,
  nasabah,
  pinjaman,
  riwayatStatusPinjaman,
  transaksi,
  transferSetoran,
} from "../../db/skema";
import {
  batalHanyaHariIni,
  kasSudahDiterimaGalat,
  melanggar,
  sudahDibatalkan,
  tidakDitemukan,
} from "../../galat";
import { wajibPeran } from "../../peran";
import { catatRiwayat } from "../../riwayat";
import type { Aktor } from "../auth/token";
import { bacaKalender } from "../lapangan/gerbang";
import { kasSudahDiterima } from "../setoran-sore/kunci-hari";

/**
 * PEMBATALAN OLEH BOS (aturan-usaha L) — hari yang sama, alasan wajib,
 * sebelum kas kolektor hari itu diterima (I4). Pembatalan membalik persis
 * yang ditulis operasi lapangan, di satu transaksi database:
 *
 *   batal angsuran  : saldo pinjaman kembali
 *   batal pelunasan : pinjaman dibuka lagi (status sebelum lunas, termasuk
 *                     tanggal macetnya) & tabungan keluar dikembalikan
 *   batal gulung    : penerus dibatalkan lebih dulu (belum ada peristiwa),
 *                     tabungan masuknya ditarik, lalu asal dibuka lagi
 *   batal akad      : status batal & tabungan masuk ditarik (L2: sebelum
 *                     ada peristiwa; akad gulung lewat batal gulung)
 *
 * Transfer setoran yang menempel pada transaksi ikut dibatalkan.
 * Docs: schema-transaksi.md, schema-pinjaman.md, schema-transfer-setoran.md.
 */
export interface PembatalanDeps {
  db: Db;
  sekarang?: () => Date;
}

const PINJAMAN_SUDAH_BERUBAH = () =>
  melanggar(
    "PINJAMAN_SUDAH_BERUBAH",
    "Pinjaman sudah berubah sesudah catatan ini — tak bisa dibatalkan",
  );

export function buatLayananPembatalan(deps: PembatalanDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const hariIni = async (aktor: Aktor) =>
    (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal;

  /** Pinjaman punya peristiwa berlaku (transaksi atau libur)? */
  async function adaPeristiwa(tx: Db, pinjamanId: string) {
    const [t] = await tx
      .select({ id: transaksi.id })
      .from(transaksi)
      .where(and(eq(transaksi.pinjamanId, pinjamanId), isNull(transaksi.dibatalkanAt)))
      .limit(1);
    const [l] = await tx
      .select({ id: liburNasabah.id })
      .from(liburNasabah)
      .where(eq(liburNasabah.pinjamanId, pinjamanId))
      .limit(1);
    return Boolean(t || l);
  }

  /**
   * Status sebelum pinjaman ditutup (lunas/digulung), dari riwayat status —
   * macet kembali macet dengan tanggal macet aslinya.
   */
  async function statusSebelumDitutup(tx: Db, pinjamanId: string) {
    const [tutup] = await tx
      .select({ sebelum: riwayatStatusPinjaman.statusSebelum })
      .from(riwayatStatusPinjaman)
      .where(
        and(
          eq(riwayatStatusPinjaman.pinjamanId, pinjamanId),
          inArray(riwayatStatusPinjaman.statusSesudah, ["lunas", "digulung"]),
        ),
      )
      .orderBy(desc(riwayatStatusPinjaman.dibuatAt))
      .limit(1);
    if (tutup?.sebelum !== "macet") return { status: "berjalan" as const, tanggalMacet: null };
    const [macet] = await tx
      .select({ tanggal: riwayatStatusPinjaman.tanggal })
      .from(riwayatStatusPinjaman)
      .where(
        and(
          eq(riwayatStatusPinjaman.pinjamanId, pinjamanId),
          eq(riwayatStatusPinjaman.statusSesudah, "macet"),
        ),
      )
      .orderBy(desc(riwayatStatusPinjaman.dibuatAt))
      .limit(1);
    return { status: "macet" as const, tanggalMacet: macet?.tanggal ?? null };
  }

  const geserTabungan = (tx: Db, nasabahId: string, selisih: number) =>
    tx
      .update(nasabah)
      .set({ saldoTabungan: sql`${nasabah.saldoTabungan} + ${selisih}` })
      .where(eq(nasabah.id, nasabahId));

  const tandaBatal = (aktor: Aktor, alasan: string) => ({
    dibatalkanAt: sekarang(),
    dibatalkanOleh: aktor.penggunaId,
    alasanBatal: alasan,
  });

  return {
    /** Batal transaksi kolektor (bos, hari yang sama). */
    async batalTransaksi(aktor: Aktor, id: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      const tanggalIni = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const [t] = await tx
          .select()
          .from(transaksi)
          .where(and(eq(transaksi.id, id), eq(transaksi.kantorId, aktor.kantorId)))
          .for("update");
        if (!t) throw tidakDitemukan("TRANSAKSI_TIDAK_DITEMUKAN", "Transaksi tidak ditemukan");
        if (t.dibatalkanAt) throw sudahDibatalkan();
        if (t.tanggal !== tanggalIni) throw batalHanyaHariIni();
        if (await kasSudahDiterima(tx, t.pencatatId, t.tanggal, "share")) {
          throw kasSudahDiterimaGalat();
        }
        const [p] = await tx
          .select()
          .from(pinjaman)
          .where(eq(pinjaman.id, t.pinjamanId))
          .for("update");
        if (!p) throw new Error("pinjaman transaksi hilang");
        const setoran = t.setoranMurni + t.setoranPelunasan;
        const tutupHariIni = p.tanggalSelesai === t.tanggal;
        const masihSama =
          t.jenis === "angsuran"
            ? (p.status === "berjalan" || p.status === "macet") && p.saldo === t.saldoSesudah
            : t.jenis === "pelunasan"
              ? p.status === "lunas" && tutupHariIni
              : p.status === "digulung" && tutupHariIni;
        if (!masihSama) throw PINJAMAN_SUDAH_BERUBAH();

        // Gulung: penerus dibatalkan lebih dulu — satu pinjaman aktif per nasabah.
        let penerusDibatalkanId: string | null = null;
        if (t.jenis === "gulung") {
          const [penerus] = await tx
            .select()
            .from(pinjaman)
            .where(and(eq(pinjaman.pinjamanAsalId, p.id), ne(pinjaman.status, "batal")))
            .for("update");
          if (!penerus) throw new Error("penerus gulung hilang");
          if (penerus.status !== "berjalan" || (await adaPeristiwa(tx, penerus.id))) {
            throw melanggar(
              "PENERUS_SUDAH_BERPERISTIWA",
              "Pinjaman penerus gulung sudah punya catatan — tak bisa dibatalkan",
            );
          }
          await tx
            .update(pinjaman)
            .set({
              status: "batal",
              tanggalSelesai: tanggalIni,
              ...tandaBatal(aktor, input.alasan),
            })
            .where(eq(pinjaman.id, penerus.id));
          await geserTabungan(tx, penerus.nasabahId, -penerus.tabunganMasuk);
          penerusDibatalkanId = penerus.id;
        }

        await tx
          .update(transaksi)
          .set(tandaBatal(aktor, input.alasan))
          .where(eq(transaksi.id, t.id));
        const transfer = await tx
          .update(transferSetoran)
          .set(tandaBatal(aktor, "transaksi dibatalkan"))
          .where(and(eq(transferSetoran.transaksiId, t.id), isNull(transferSetoran.dibatalkanAt)))
          .returning({ id: transferSetoran.id });

        const kembali =
          t.jenis === "angsuran"
            ? { saldo: p.saldo + setoran }
            : { saldo: setoran, tanggalSelesai: null, ...(await statusSebelumDitutup(tx, p.id)) };
        const [sesudah] = await tx
          .update(pinjaman)
          .set(kembali)
          .where(eq(pinjaman.id, p.id))
          .returning({ id: pinjaman.id, status: pinjaman.status, saldo: pinjaman.saldo });
        if (!sesudah) throw new Error("pinjaman hilang");
        if (t.tabunganKeluar > 0) await geserTabungan(tx, p.nasabahId, t.tabunganKeluar);

        return {
          id: t.id,
          jenis: t.jenis,
          tanggal: t.tanggal,
          alasanBatal: input.alasan,
          pinjaman: sesudah,
          penerusDibatalkanId,
          transferDibatalkan: transfer.length,
        };
      });
    },

    /** Batal akad salah input (bos): hari akad, sebelum ada peristiwa & kas pencair diterima. */
    async batalAkad(aktor: Aktor, id: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      const tanggalIni = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const [p] = await tx
          .select()
          .from(pinjaman)
          .where(and(eq(pinjaman.id, id), eq(pinjaman.kantorId, aktor.kantorId)))
          .for("update");
        if (!p) throw tidakDitemukan("PINJAMAN_TIDAK_DITEMUKAN", "Pinjaman tidak ditemukan");
        if (p.status === "batal") throw sudahDibatalkan();
        if (p.asal === "gulung") {
          throw melanggar(
            "BATAL_LEWAT_GULUNG",
            "Akad gulung dibatalkan lewat batal transaksi gulung pinjaman asalnya",
          );
        }
        // Salinan migrasi (A10): hari disalin; boleh disalin macet; tanpa uang keluar.
        const salinan = p.asal === "migrasi";
        if ((salinan ? p.tanggalDisalin : p.tanggalAkad) !== tanggalIni) throw batalHanyaHariIni();
        const statusAwal = salinan ? ["berjalan", "macet"] : ["berjalan"];
        if (!statusAwal.includes(p.status) || (await adaPeristiwa(tx, p.id))) {
          throw melanggar(
            "PINJAMAN_SUDAH_BERPERISTIWA",
            "Pinjaman ini sudah punya catatan — akad tak bisa dibatalkan",
          );
        }
        if (!salinan && (await kasSudahDiterima(tx, p.pencairId, p.tanggalAkad, "share"))) {
          throw kasSudahDiterimaGalat();
        }
        await tx
          .update(pinjaman)
          .set({
            status: "batal",
            tanggalSelesai: tanggalIni,
            tanggalMacet: null,
            ...tandaBatal(aktor, input.alasan),
          })
          .where(eq(pinjaman.id, p.id));
        await geserTabungan(tx, p.nasabahId, -p.tabunganMasuk);
        return {
          id: p.id,
          status: "batal" as const,
          alasanBatal: input.alasan,
          tabunganDitarik: p.tabunganMasuk,
        };
      });
    },

    /**
     * Hapus tanda libur salah (bos, hari yang sama). Libur bukan uang: baris
     * dihapus dan isinya + alasan dicatat di riwayat — sesudahnya kolektor
     * bisa mencatat setoran pinjaman itu hari ini.
     */
    async hapusLibur(aktor: Aktor, id: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      const tanggalIni = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const [l] = await tx
          .select({
            id: liburNasabah.id,
            pinjamanId: liburNasabah.pinjamanId,
            pencatatId: liburNasabah.pencatatId,
            tanggal: liburNasabah.tanggal,
            alasanLibur: liburNasabah.alasanLibur,
          })
          .from(liburNasabah)
          .where(and(eq(liburNasabah.id, id), eq(liburNasabah.kantorId, aktor.kantorId)))
          .for("update");
        if (!l) throw tidakDitemukan("LIBUR_TIDAK_DITEMUKAN", "Tanda libur tidak ditemukan");
        if (l.tanggal !== tanggalIni) throw batalHanyaHariIni();
        await tx.delete(liburNasabah).where(eq(liburNasabah.id, l.id));
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "libur_nasabah",
          barisId: l.id,
          aksi: "hapus_libur",
          sebelum: l,
          alasan: input.alasan,
          pelakuId: aktor.penggunaId,
        });
        const { pencatatId: _, ...libur } = l;
        return libur;
      });
    },
  };
}

export type LayananPembatalan = ReturnType<typeof buatLayananPembatalan>;
