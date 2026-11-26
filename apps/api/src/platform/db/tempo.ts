import { HARI_BATAS_TEMPO, TEMPO } from "@opennael/domain";
import { type SQL, sql } from "drizzle-orm";
import { hariKolektor, nasabah, pinjaman } from "./skema";

/**
 * JATUH TEMPO TEMPOAN — aturan-usaha A4 (keputusan pemilik 26 Nov 2026). Tidak disimpan:
 * dihitung dari absen setiap dibaca, supaya koreksi absen dan pindah pemegang langsung
 * terbaca. Hari ke-N = hari kolektor PEMEGANG SAAT INI (`nasabah.kolektor_id`) absen
 * `masuk_kerja` sesudah tanggal akad, urut tanggal. Dipakai di SELECT yang memuat tabel
 * `pinjaman` (subkueri berkorelasi lewat `pinjaman.nasabah_id`); jenis lain = null / 0.
 */
const hariMasukPemegang = sql`${hariKolektor}
  where ${hariKolektor.kolektorId} = (
      select ${nasabah.kolektorId} from ${nasabah} where ${nasabah.id} = ${pinjaman.nasabahId}
    )
    and ${hariKolektor.absensi} = 'masuk_kerja'
    and ${hariKolektor.tanggal} > ${pinjaman.tanggalAkad}`;

/** Tanggal hari masuk kerja ke-`ke` (`YYYY-MM-DD`), null bila belum sampai atau bukan tempoan. */
function hariMasukKe(ke: number): SQL<string | null> {
  return sql<string | null>`case when ${pinjaman.jenis} = 'tempoan' then (
    select ${hariKolektor.tanggal}::text from ${hariMasukPemegang}
    order by ${hariKolektor.tanggal} offset ${sql.raw(String(ke - 1))} limit 1
  ) end`;
}

/** Jatuh tempo = hari masuk kerja ke-6. */
export const jatuhTempoTempoan = (): SQL<string | null> => hariMasukKe(TEMPO.jatuhTempoKe);

/** Batas lunas = hari masuk kerja ke-10 (6 + janji 4): janji habis, belum lunas → macet. */
export const batasTempoTempoan = (): SQL<string | null> => hariMasukKe(HARI_BATAS_TEMPO);

/** Hari masuk kerja yang sudah dilewati sejak akad (s/d hari ini); bukan tempoan = 0. */
export const hariTempoTempoan = (): SQL<number> =>
  sql<number>`case when ${pinjaman.jenis} = 'tempoan' then (
    select count(*)::int from ${hariMasukPemegang}
  ) else 0 end`.mapWith(Number);
