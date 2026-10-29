import type { KartuTagih } from "@opennael/contracts";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { hariKolektor, liburNasabah, transaksi } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";

export async function catatanHari(
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

export async function hariIni(db: Db, aktor: Aktor, tanggal: string) {
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
