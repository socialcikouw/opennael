import type { JenisMutasiKas } from "@opennael/domain";
import { sql } from "drizzle-orm";
import type { Db } from "../../db/klien";

/**
 * GERAKAN BUKU KAS — setiap rupiah dibaca dari tabel asalnya, tidak disalin
 * (docs/skema/schema-buku-kas.md#rumus-saldo-akun). Yang batal tidak dihitung.
 *
 *   tunai : mutasi, serah terima (tunai diterima − kas lapangan − uang jalan),
 *           penarikan tabungan, gaji
 *   bank  : mutasi, transfer setoran (sejak dicatat kasir), transfer lama
 *           (arsip), penarikan tabungan, gaji
 */
export type SumberGerakan =
  | "mutasi"
  | "serah_terima"
  | "transfer_setoran"
  | "transfer_lama"
  | "penarikan_tabungan"
  | "pembayaran_gaji";

export interface GerakanKas {
  tanggal: string;
  akun: "tunai" | "bank";
  /** Plus = masuk; minus = keluar. */
  nominal: number;
  sumber: SumberGerakan;
  sumberId: string;
  jenis: JenisMutasiKas | null;
  keterangan: string | null;
}

function gerakan(kantorId: string, tanggalBuka: string) {
  return sql`
    SELECT m.tanggal::text AS tanggal, m.ke_akun::text AS akun, m.nominal AS nominal,
           'mutasi' AS sumber, m.id::text AS sumber_id, m.jenis::text AS jenis, m.keterangan
      FROM mutasi_kas_kantor m
     WHERE m.kantor_id = ${kantorId} AND m.dibatalkan_at IS NULL AND m.ke_akun IS NOT NULL
    UNION ALL
    SELECT m.tanggal::text, m.dari_akun::text, -m.nominal,
           'mutasi', m.id::text, m.jenis::text, m.keterangan
      FROM mutasi_kas_kantor m
     WHERE m.kantor_id = ${kantorId} AND m.dibatalkan_at IS NULL AND m.dari_akun IS NOT NULL
    UNION ALL
    SELECT h.tanggal::text, 'tunai', s.tunai_diterima - h.kas_lapangan - h.uang_jalan,
           'serah_terima', s.id::text, NULL, k.nama
      FROM serah_terima_kas s
      JOIN hari_kolektor h ON h.id = s.hari_kolektor_id
      JOIN pengguna k ON k.id = h.kolektor_id
     WHERE s.kantor_id = ${kantorId} AND s.dibatalkan_at IS NULL AND h.tanggal >= ${tanggalBuka}
    UNION ALL
    SELECT t.tanggal::text, 'bank', ts.nominal,
           'transfer_setoran', ts.id::text, NULL, n.nama
      FROM transfer_setoran ts
      JOIN transaksi t ON t.id = ts.transaksi_id
      JOIN pinjaman p ON p.id = t.pinjaman_id
      JOIN nasabah n ON n.id = p.nasabah_id
     WHERE ts.kantor_id = ${kantorId} AND ts.dibatalkan_at IS NULL AND t.dibatalkan_at IS NULL
       AND t.tanggal >= ${tanggalBuka}
    UNION ALL
    SELECT h.tanggal::text, 'bank', h.transfer_lama,
           'transfer_lama', h.id::text, NULL, k.nama
      FROM hari_kolektor h
      JOIN pengguna k ON k.id = h.kolektor_id
     WHERE h.kantor_id = ${kantorId} AND h.transfer_lama IS NOT NULL AND h.tanggal >= ${tanggalBuka}
    UNION ALL
    SELECT pt.tanggal::text, pt.dari_akun::text, -pt.nominal,
           'penarikan_tabungan', pt.id::text, NULL, n.nama
      FROM penarikan_tabungan pt
      JOIN nasabah n ON n.id = pt.nasabah_id
     WHERE pt.kantor_id = ${kantorId} AND pt.dibatalkan_at IS NULL
    UNION ALL
    SELECT g.tanggal_bayar::text, g.dari_akun::text, -g.gaji_bersih,
           'pembayaran_gaji', g.id::text, NULL, k.nama
      FROM pembayaran_gaji g
      JOIN pengguna k ON k.id = g.kolektor_id
     WHERE g.kantor_id = ${kantorId} AND g.dibatalkan_at IS NULL`;
}

type Buku = { kantorId: string; tanggalBuka: string; kasAwalTunai: number; kasAwalBank: number };

/** Saldo tiap akun di akhir `sampai` (tanpa `sampai` = semua catatan sampai saat ini). */
export async function saldoAkun(db: Db, buku: Buku, sampai?: string) {
  const baris = (await db.execute(sql`
    SELECT g.akun, coalesce(sum(g.nominal), 0)::bigint AS jumlah
      FROM (${gerakan(buku.kantorId, buku.tanggalBuka)}) g
     WHERE ${sampai ? sql`g.tanggal <= ${sampai}` : sql`true`}
     GROUP BY g.akun`)) as unknown as { akun: "tunai" | "bank"; jumlah: string }[];
  const dari = (akun: "tunai" | "bank") => Number(baris.find((b) => b.akun === akun)?.jumlah ?? 0);
  return { tunai: buku.kasAwalTunai + dari("tunai"), bank: buku.kasAwalBank + dari("bank") };
}

/** Gerakan dalam rentang tanggal, urut tanggal. */
export async function daftarGerakan(
  db: Db,
  buku: Buku,
  mulai: string,
  selesai: string,
): Promise<GerakanKas[]> {
  const baris = (await db.execute(sql`
    SELECT * FROM (${gerakan(buku.kantorId, buku.tanggalBuka)}) g
     WHERE g.tanggal BETWEEN ${mulai} AND ${selesai}
     ORDER BY g.tanggal, g.sumber, g.sumber_id`)) as unknown as {
    tanggal: string;
    akun: "tunai" | "bank";
    nominal: string;
    sumber: SumberGerakan;
    sumber_id: string;
    jenis: JenisMutasiKas | null;
    keterangan: string | null;
  }[];
  return baris.map((b) => ({
    tanggal: b.tanggal,
    akun: b.akun,
    nominal: Number(b.nominal),
    sumber: b.sumber,
    sumberId: b.sumber_id,
    jenis: b.jenis,
    keterangan: b.keterangan,
  }));
}

/**
 * Kas di lapangan saat ini: kas lapangan + uang jalan hari kolektor masuk
 * kerja yang BELUM punya serah terima berlaku — sudah keluar dari brankas,
 * baru dikurangkan dari saldo tunai saat serah terima.
 */
export async function kasDiLapangan(db: Db, buku: Buku): Promise<number> {
  const [b] = (await db.execute(sql`
    SELECT coalesce(sum(h.kas_lapangan + h.uang_jalan), 0)::bigint AS jumlah
      FROM hari_kolektor h
     WHERE h.kantor_id = ${buku.kantorId} AND h.absensi = 'masuk_kerja'
       AND h.tanggal >= ${buku.tanggalBuka}
       AND NOT EXISTS (
         SELECT 1 FROM serah_terima_kas s
          WHERE s.hari_kolektor_id = h.id AND s.dibatalkan_at IS NULL)`)) as unknown as {
    jumlah: string;
  }[];
  return Number(b?.jumlah ?? 0);
}

/**
 * Tabungan nasabah sekantor di akhir `sampai` (aturan-usaha H1), dari catatan
 * berlaku — bukan dari cache `nasabah.saldo_tabungan`, supaya tanggal lampau
 * pun bisa dihitung. Salinan migrasi masuk pada hari disalin.
 */
export async function tabunganNasabah(db: Db, kantorId: string, sampai: string): Promise<number> {
  const [b] = (await db.execute(sql`
    SELECT
      (SELECT coalesce(sum(tabungan_masuk), 0) FROM pinjaman
        WHERE kantor_id = ${kantorId} AND dibatalkan_at IS NULL
          AND coalesce(tanggal_disalin, tanggal_akad) <= ${sampai})
    - (SELECT coalesce(sum(tabungan_keluar), 0) FROM transaksi
        WHERE kantor_id = ${kantorId} AND dibatalkan_at IS NULL AND tanggal <= ${sampai})
    - (SELECT coalesce(sum(nominal), 0) FROM penarikan_tabungan
        WHERE kantor_id = ${kantorId} AND dibatalkan_at IS NULL AND tanggal <= ${sampai})
    + (SELECT coalesce(sum(selisih), 0) FROM koreksi_tabungan
        WHERE kantor_id = ${kantorId} AND tanggal <= ${sampai})
    AS jumlah`)) as unknown as { jumlah: string }[];
  return Number(b?.jumlah ?? 0);
}
