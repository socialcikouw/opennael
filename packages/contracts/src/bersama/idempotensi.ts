import { z } from "zod";

export const kunciIdempotenSchema = z.uuid();
/** Opsional selama klien lama beredar. Klien baru mempertahankan UUID saat retry. */
export const kepalaIdempotenSchema = z.object({
  "idempotency-key": kunciIdempotenSchema.optional(),
});

/**
 * Operasi tulis yang DIJAMIN idempoten di server (`denganIdempotensi` di
 * `apps/api`): hasil berhasil disimpan per kunci, jadi mengulang dengan
 * `Idempotency-Key` yang sama mengembalikan hasil yang sama tanpa efek ganda.
 * Hanya operasi ini yang disisipi kunci dan diulang otomatis oleh klien —
 * operasi tulis lain TIDAK aman diulang. Bentuk `METODE /jalur` persis seperti
 * di dokumen OpenAPI (`{param}` untuk parameter jalur). Diuji terhadap
 * OpenAPI (`apps/api/src/daftar-idempoten.test.ts`) agar tidak
 * melenceng dari rute; menambah operasi baru ke `denganIdempotensi` berarti
 * menambahkannya di sini juga.
 */
export const OPERASI_IDEMPOTEN = [
  // Lapangan (kolektor)
  "POST /lapangan/absen",
  "POST /lapangan/laporan",
  "POST /lapangan/akad",
  "POST /lapangan/gulung",
  "POST /lapangan/bayar",
  "POST /lapangan/lunas",
  "POST /lapangan/libur",
  // Setoran sore
  "POST /hari-kolektor/{kolektorId}/terima-kas",
  "PATCH /hari-kolektor/{kolektorId}/hari-ini",
  "POST /hari-kolektor/{kolektorId}/laporan/batal",
  "POST /serah-terima-kas/{id}/batal",
  "POST /transfer-setoran",
  "POST /transfer-setoran/{id}/batal",
  "POST /biaya-tak-terduga",
  "POST /biaya-tak-terduga/{id}/batal",
  // Kas kantor & gaji
  "POST /kas/buka",
  "PATCH /kas/buka",
  "POST /kas/mutasi",
  "POST /kas/mutasi/{id}/batal",
  "POST /kas/pencocokan",
  "POST /kas/pencocokan/{id}/batal",
  "POST /kas/gaji",
  "POST /kas/gaji/{id}/batal",
  // Migrasi, pembatalan, tabungan
  "POST /pinjaman/migrasi",
  "POST /transaksi/{id}/batal",
  "POST /pinjaman/{id}/batal",
  "POST /transaksi/libur/{id}/hapus",
  "POST /nasabah/{id}/penarikan-tabungan",
  "POST /penarikan-tabungan/{id}/batal",
  "POST /nasabah/{id}/koreksi-tabungan",
] as const;

const POLA = OPERASI_IDEMPOTEN.map((operasi) => {
  const [metode = "", jalur = ""] = operasi.split(" ");
  const regex = jalur.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{[^}]+\}/g, "[^/]+");
  return { metode, regex: new RegExp(`^${regex}$`) };
});

/** Apakah `metode` + `jalur` (tanpa query, tanpa awalan alamat dasar) operasi idempoten? */
export function operasiIdempoten(metode: string, jalur: string): boolean {
  const m = metode.toUpperCase();
  return POLA.some((p) => p.metode === m && p.regex.test(jalur));
}
