import { peranSchema } from "@opennael/contracts";
import { z } from "zod";

/**
 * PARAMETER PENCARIAN (`?…`) TIAP RUTE — satu skema Zod per rute, dipasang di
 * `validateSearch`. Sengaja lunak: nilai yang tidak sah diabaikan
 * (`.catch(undefined)` per kunci), bukan galat, dan semua kunci opsional —
 * tautan lama atau tanpa `search` tetap sah. Tipe masukan tetap bertipe
 * (`string | undefined`), jadi `<Link search>` dan `navigate({ search })`
 * tetap diperiksa.
 */

/** Tanggal `YYYY-MM-DD` yang sah atau tidak ada. */
export const tanggalSah = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);

/** Teks tak kosong atau tidak ada. */
export const teksSah = z.string().min(1).optional().catch(undefined);

/** Satu nilai dari `daftar` persis, atau tidak ada. */
export const pilihanSah = <const T extends readonly [string, ...string[]]>(daftar: T) =>
  z.enum(daftar).optional().catch(undefined);

/** Saringan tanggal bersama — semua kunci opsional supaya tautan tanpa `search` tetap sah. */
export const saringTanggal = z.object({ tanggal: tanggalSah });

export const TAB_HARIAN = ["setoran", "libur", "transfer", "biaya"] as const;
/** Tab Pengaturan selain "kantor" (tab bawaan, tanpa parameter). */
export const TAB_PENGATURAN = ["rem", "libur", "tarif", "rute", "kampung"] as const;

/** `/aktivitas` */
export const saringAktivitas = saringTanggal.extend({ pelaku: teksSah });

/** `/gaji` */
export const saringGaji = z.object({ kolektor: teksSah, mulai: tanggalSah, selesai: tanggalSah });

/** `/harian` */
export const saringHarian = saringTanggal.extend({ tab: pilihanSah(TAB_HARIAN) });

/** `/karyawan` */
export const saringKaryawan = z.object({
  peran: peranSchema.optional().catch(undefined),
  nonaktif: pilihanSah(["ya"]),
});

/** `/kas` */
export const saringKas = z.object({
  mulai: tanggalSah,
  selesai: tanggalSah,
  tab: pilihanSah(["cocok"]),
});

/** `/nasabah` */
export const saringNasabah = z.object({ cari: teksSah, kolektor: teksSah, pilih: teksSah });

/** `/pengaturan` */
export const saringPengaturan = z.object({ tab: pilihanSah(TAB_PENGATURAN) });

/** `/pinjaman` */
export const saringPinjaman = z.object({
  kolektor: teksSah,
  status: pilihanSah(["selesai", "semua"]),
  tunggak: pilihanSah(["ya"]),
  pilih: teksSah,
});
