import { wajibDitagihHariIni } from "@opennael/domain";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { hariKolektor, nasabah, pinjaman } from "../../../db/skema";
import { melanggar } from "../../../galat";
import { wajibPeran } from "../../../peran";
import type { Aktor } from "../../auth/token";
import { catatanHari, hariIni, type LapanganDeps } from "../data";
import { bacaKalender } from "../gerbang";

export function buatBukaLaporan(deps: LapanganDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());

  /** Buka laporan — operasi lapangan berhenti hari ini. Mengulang = jawaban sama. */
  return async function bukaLaporan(aktor: Aktor) {
    wajibPeran(aktor, "kolektor");
    const { tanggal } = await bacaKalender(deps.db, aktor.kantorId, sekarang());
    const h = await hariIni(deps.db, aktor, tanggal);
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
    const sesudah = await hariIni(deps.db, aktor, tanggal);
    if (!sesudah) throw new Error("hari kolektor hilang");
    return sesudah;
  };
}
