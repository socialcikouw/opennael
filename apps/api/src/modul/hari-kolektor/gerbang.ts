import { and, eq } from "drizzle-orm";
import type { Db } from "../../platform/db/klien";
import { hariKolektor } from "../../platform/db/skema";
import type { Aktor } from "../../platform/http/aktor";
import { melanggar } from "../../platform/http/galat";
import { wajibPeran } from "../../platform/http/peran";
import { bacaKalender, kalenderGerbang, type ValidasiKalender } from "../kantor";

/**
 * GERBANG LAPANGAN (aturan-usaha C4): kolektor, jam kerja, hari kerja, bukan
 * libur kantor — dan, untuk setoran/akad/gulung/libur, sudah absen masuk
 * kerja serta laporan hari itu belum dibuka.
 */
export async function bukaGerbang(
  db: Db,
  aktor: Aktor,
  sekarang: Date,
  opsi: { perluAbsen: boolean; validasi: ValidasiKalender },
): Promise<{ tanggal: string }> {
  wajibPeran(aktor, "kolektor");
  const kal = kalenderGerbang(await bacaKalender(db, aktor.kantorId, sekarang), opsi.validasi);
  if (!kal.dalamJamKerja) throw melanggar("DI_LUAR_JAM_KERJA", "Di luar jam kerja kantor");
  if (!kal.hariKerja) throw melanggar("BUKAN_HARI_KERJA", "Hari ini bukan hari kerja kantor");
  if (kal.liburKantor) {
    throw melanggar("LIBUR_KANTOR", `Kantor libur hari ini: ${kal.liburKantor}`);
  }
  if (opsi.perluAbsen) {
    const [hari] = await db
      .select({ absensi: hariKolektor.absensi, laporan: hariKolektor.laporanDibukaAt })
      .from(hariKolektor)
      .where(
        and(eq(hariKolektor.kolektorId, aktor.penggunaId), eq(hariKolektor.tanggal, kal.tanggal)),
      )
      .for("update")
      .limit(1);
    if (!hari) throw melanggar("BELUM_ABSEN", "Isi absensi hari ini lebih dulu");
    if (hari.absensi !== "masuk_kerja") {
      throw melanggar("TIDAK_KERJA_HARI_INI", "Anda tercatat tidak kerja hari ini");
    }
    if (hari.laporan) {
      throw melanggar(
        "LAPORAN_SUDAH_DIBUKA",
        "Laporan hari ini sudah dibuka — operasi lapangan berhenti",
      );
    }
  }
  return { tanggal: kal.tanggal };
}

/** Dependensi operasi lapangan: database, jam, dan saklar pemeriksaan kalender gerbang. */
export interface GerbangDeps {
  db: Db;
  sekarang?: () => Date;
  /** Bawaan: semua pemeriksaan kalender gerbang dijalankan. */
  validasiKalender?: ValidasiKalender;
}
