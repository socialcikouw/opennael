import type { TerimaKasInput } from "@opennael/contracts";
import { and, eq } from "drizzle-orm";
import { hariKolektor, serahTerimaKas } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import { kasSudahDiterimaGalat, melanggar } from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { hitungRincian, type Konteks, namaKolektor, satuHari } from "../data";
import { kasSudahDiterima } from "../kunci-hari";

export function buatTerimaKas(k: Konteks) {
  /**
   * Terima kas (kasir/bos) — HITUNG BUTA: penerima mengisi uang yang ia
   * hitung; tunai seharusnya dihitung & dibekukan di sini, baru dijawab
   * bersama selisihnya. Baris hari dikunci lebih dulu supaya angka yang
   * dibekukan memuat semua transfer & biaya.
   */
  return async function terimaKas(aktor: Aktor, kolektorId: string, input: TerimaKasInput) {
    wajibPeran(aktor, "kasir", "bos");
    const tanggal = await k.hariIni(aktor);
    await namaKolektor(k.db, aktor, kolektorId);
    return k.db.transaction(async (tx) => {
      const [h] = await tx
        .select({
          id: hariKolektor.id,
          absensi: hariKolektor.absensi,
          laporanDibukaAt: hariKolektor.laporanDibukaAt,
          kasLapangan: hariKolektor.kasLapangan,
          transferLama: hariKolektor.transferLama,
        })
        .from(hariKolektor)
        .where(and(eq(hariKolektor.kolektorId, kolektorId), eq(hariKolektor.tanggal, tanggal)))
        .for("update");
      if (!h) throw melanggar("BELUM_ABSEN", "Kolektor ini belum absen hari ini");
      if (h.absensi !== "masuk_kerja") {
        throw melanggar("TIDAK_KERJA_HARI_INI", "Kolektor ini tercatat tidak kerja hari ini");
      }
      if (!h.laporanDibukaAt) {
        throw melanggar("LAPORAN_BELUM_DIBUKA", "Kolektor belum membuka laporan hari ini");
      }
      if (await kasSudahDiterima(tx, kolektorId, tanggal)) throw kasSudahDiterimaGalat();
      const rincian = await hitungRincian(tx, { kolektorId, tanggal, ...h });
      await tx.insert(serahTerimaKas).values({
        kantorId: aktor.kantorId,
        hariKolektorId: h.id,
        tunaiSeharusnya: rincian.tunaiSeharusnya,
        tunaiDiterima: input.tunaiDiterima,
        diterimaOleh: aktor.penggunaId,
      });
      return satuHari(tx, aktor, kolektorId, tanggal);
    });
  };
}
