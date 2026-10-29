import { type AnyColumn, type SQL, sql } from "drizzle-orm";
import { bigint, doublePrecision, type PgColumn, smallint, timestamp } from "drizzle-orm/pg-core";

/** `timestamptz` — semua kolom `*_at` (konvensi #9). */
export const waktu = () => timestamp({ withTimezone: true, mode: "date" });

/**
 * `dibuat_at` + `diubah_at` standar (fungsi: setiap tabel butuh builder
 * kolomnya sendiri). `diubah_at` disentuh trigger `atur_diubah_at`.
 */
export const jejakWaktu = () => ({
  dibuatAt: waktu().notNull().defaultNow(),
  diubahAt: waktu().notNull().defaultNow(),
});

/** Titik GPS (rumah nasabah, tempat foto diambil) — ketiganya terisi atau kosong bersama. */
export const lokasi = () => ({
  latitude: doublePrecision(),
  longitude: doublePrecision(),
  /** Akurasi GPS dari HP, meter. */
  akurasiMeter: smallint(),
});

/**
 * CHECK lokasi: lengkap di dalam batas Indonesia (lintang −11…6, bujur
 * 95…141, akurasi > 0) atau kosong semua. Setiap kolom ditulis `IS NOT NULL`
 * terang — CHECK meloloskan NULL.
 */
export function cekLokasi(t: {
  latitude: PgColumn;
  longitude: PgColumn;
  akurasiMeter: PgColumn;
}): SQL {
  return sql`(${t.latitude} IS NULL AND ${t.longitude} IS NULL AND ${t.akurasiMeter} IS NULL)
    OR (${t.latitude} IS NOT NULL AND ${t.longitude} IS NOT NULL AND ${t.akurasiMeter} IS NOT NULL
      AND ${t.latitude} BETWEEN -11 AND 6 AND ${t.longitude} BETWEEN 95 AND 141
      AND ${t.akurasiMeter} > 0)`;
}

/** Kolom uang: `bigint` rupiah tanpa pecahan (konvensi #4). */
export const rupiah = () => bigint({ mode: "number" });

/** Kolom batal terisi bersamaan atau kosong bersamaan. */
export const cekBatal = (t: {
  dibatalkanAt: AnyColumn;
  dibatalkanOleh: AnyColumn;
  alasanBatal: AnyColumn;
}) =>
  sql`(${t.dibatalkanAt} IS NULL AND ${t.dibatalkanOleh} IS NULL AND ${t.alasanBatal} IS NULL)
    OR (${t.dibatalkanAt} IS NOT NULL AND ${t.dibatalkanOleh} IS NOT NULL AND ${t.alasanBatal} IS NOT NULL)`;
