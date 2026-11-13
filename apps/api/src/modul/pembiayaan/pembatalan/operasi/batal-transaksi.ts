import type { BatalInput } from "@opennael/contracts";
import { and, eq, ne } from "drizzle-orm";
import { pinjaman, transaksi } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import {
  batalHanyaHariIni,
  kasSudahDiterimaGalat,
  melanggar,
  sudahDibatalkan,
  tidakDitemukan,
} from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { batalTransferTransaksi, kasSudahDiterima } from "../../../hari-kolektor";
import {
  adaPeristiwa,
  geserTabungan,
  type Konteks,
  PINJAMAN_SUDAH_BERUBAH,
  statusSebelumDitutup,
  tandaBatal,
} from "../data";

export function buatBatalTransaksi(k: Konteks) {
  /** Batal transaksi kolektor (bos, hari yang sama). */
  return async function batalTransaksi(aktor: Aktor, id: string, input: BatalInput) {
    wajibPeran(aktor, "bos");
    const tanggalIni = await k.hariIni(aktor);
    return k.db.transaction(async (tx) => {
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
            ...tandaBatal(k, aktor, input.alasan),
          })
          .where(eq(pinjaman.id, penerus.id));
        await geserTabungan(tx, penerus.nasabahId, -penerus.tabunganMasuk);
        penerusDibatalkanId = penerus.id;
      }

      await tx
        .update(transaksi)
        .set(tandaBatal(k, aktor, input.alasan))
        .where(eq(transaksi.id, t.id));
      const transferDibatalkan = await batalTransferTransaksi(tx, aktor, t.id, k.sekarang());

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
        transferDibatalkan,
      };
    });
  };
}
