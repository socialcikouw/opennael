import { sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import type { Aktor } from "../../../platform/http/aktor";
import { dilarang, melanggar } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";

/** Pembantu privat RINGKASAN: konteks layanan, agregat SQL, dan saringan rentang. */

/** Yang dibutuhkan semua kueri: database dan "hari ini" kantor aktor. */
export interface Konteks {
  db: Db;
  hariIni: (aktor: Aktor) => Promise<string>;
}

/** Deret performa paling panjang ±1 tahun. */
export const RENTANG_PERFORMA_MAKS = 366;

export const jumlah = <T>(nilai: T) => sql<number>`coalesce(sum(${nilai}), 0)`.mapWith(Number);
export const banyak = () => sql<number>`count(*)`.mapWith(Number);

export async function saring(
  k: Konteks,
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
  const hari = await k.hariIni(aktor);
  const mulai = s.mulai ?? hari;
  const selesai = s.selesai ?? (s.mulai ? mulai : hari);
  if (mulai > selesai)
    throw melanggar("RENTANG_TIDAK_SAH", "Tanggal mulai sesudah tanggal selesai");
  return { kolektorId, mulai, selesai };
}
