import { describe, test } from "bun:test";
import postgres from "postgres";
import { Batalkan, tolak, URL_DB as url } from "../../../uji/skema";
import { pastikanDatabasePengembangan } from "../penjaga";

/** Uji skema (hari_kolektor, libur, kebijakan) — lihat uji/skema.ts untuk aturan umumnya. */
describe.skipIf(!url)("skema database", () => {
  test("hari_kolektor, libur, kebijakan menolak data salah", async () => {
    pastikanDatabasePengembangan(url);
    const sql = postgres(url as string, { prepare: false, max: 1, onnotice: () => {} });
    try {
      await sql
        .begin(async (tx) => {
          const [k] = await tx`insert into kantor (nama) values ('Uji A') returning id`;
          const [bos] = await tx`
            insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
            values (${k?.id}, 'bos', 'Bos A', '+6281234567890', 'hash') returning id`;
          const [kol] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kolektor', 'Andi') returning id`;
          const [kasir] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kasir', 'Sari') returning id`;
          const [w] = await tx`
            insert into wilayah (kantor_id, nama, dibuat_oleh) values (${k?.id}, 'Pule', ${kol?.id}) returning id`;
          const [n] = await tx`
            insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
            values (${k?.id}, ${kol?.id}, 'Budi', ${w?.id}) returning id`;
          const [p] = await tx`
            insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
              asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
              total_kembali, angsuran, saldo_awal, drop_baru, saldo)
            values (${k?.id}, ${kol?.id}, ${bos?.id}, ${n?.id}, 1, 'harian', 24, 'migrasi', '2026-10-01',
              '2026-10-01', 1000000, 0, 50000, 0, 1200000, 50000, 1200000, 0, 1200000) returning id`;
          const [hari] = await tx`select kantor_hari_ini(${k?.id}) as h`;
          const hariIni = hari?.h as Date;

          // ---- hari_kolektor -------------------------------------------------
          await tx`insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi, kas_lapangan, uang_jalan)
                   values (${k?.id}, ${kol?.id}, '2026-10-02', 'masuk_kerja', 1000000, 50000)`;
          await tolak(
            tx,
            "uniq_hari_kolektor_kolektor_tanggal",
            (sp) =>
              sp`insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi)
               values (${k?.id}, ${kol?.id}, '2026-10-02', 'masuk_kerja')`,
          );
          await tolak(
            tx,
            "hari_kolektor_kolektor_fk",
            (sp) =>
              sp`insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi)
               values (${k?.id}, ${kasir?.id}, '2026-10-02', 'masuk_kerja')`,
          );
          // Tidak kerja: alasan wajib, tanpa uang lapangan & laporan.
          await tolak(
            tx,
            "hari_kolektor_absensi_check",
            (sp) =>
              sp`insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi)
               values (${k?.id}, ${kol?.id}, '2026-10-03', 'tidak_kerja')`,
          );
          await tolak(
            tx,
            "hari_kolektor_absensi_check",
            (sp) =>
              sp`insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi, alasan_tidak_kerja, kas_lapangan)
               values (${k?.id}, ${kol?.id}, '2026-10-03', 'tidak_kerja', 'sakit', 100000)`,
          );
          await tolak(
            tx,
            "hari_kolektor_absensi_check",
            (sp) =>
              sp`insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi, alasan_tidak_kerja)
               values (${k?.id}, ${kol?.id}, '2026-10-03', 'masuk_kerja', 'x')`,
          );
          await tolak(
            tx,
            "hari_kolektor_nominal_check",
            (sp) =>
              sp`insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi, uang_jalan)
               values (${k?.id}, ${kol?.id}, '2026-10-03', 'masuk_kerja', -1)`,
          );

          // ---- libur_nasabah ↔ transaksi (satu peristiwa per hari) -----------
          await tx`insert into libur_nasabah (kantor_id, pencatat_id, pinjaman_id, tanggal)
                   values (${k?.id}, ${kol?.id}, ${p?.id}, '2026-10-02')`;
          await tolak(
            tx,
            "uniq_libur_nasabah_pinjaman_tanggal",
            (sp) =>
              sp`insert into libur_nasabah (kantor_id, pencatat_id, pinjaman_id, tanggal)
               values (${k?.id}, ${kol?.id}, ${p?.id}, '2026-10-02')`,
          );
          await tolak(
            tx,
            "transaksi_bentrok_libur",
            (sp) =>
              sp`insert into transaksi (kantor_id, pencatat_id, pinjaman_id, tanggal, jenis, setoran_murni, saldo_sesudah)
               values (${k?.id}, ${kol?.id}, ${p?.id}, '2026-10-02', 'angsuran', 50000, 1150000)`,
          );
          await tx`insert into transaksi (kantor_id, pencatat_id, pinjaman_id, tanggal, jenis, setoran_murni, saldo_sesudah)
                   values (${k?.id}, ${kol?.id}, ${p?.id}, '2026-10-03', 'angsuran', 50000, 1150000)`;
          await tolak(
            tx,
            "libur_nasabah_bentrok",
            (sp) =>
              sp`insert into libur_nasabah (kantor_id, pencatat_id, pinjaman_id, tanggal)
               values (${k?.id}, ${kol?.id}, ${p?.id}, '2026-10-03')`,
          );
          await tolak(
            tx,
            "libur_nasabah_pencatat_fk",
            (sp) =>
              sp`insert into libur_nasabah (kantor_id, pencatat_id, pinjaman_id, tanggal)
               values (${k?.id}, ${bos?.id}, ${p?.id}, '2026-10-04')`,
          );

          // ---- libur_kantor ----------------------------------------------------
          await tx`insert into libur_kantor (kantor_id, tanggal, alasan_libur, dibuat_oleh)
                   values (${k?.id}, ${hariIni}::date + 3, 'Idul Fitri', ${bos?.id})`;
          await tolak(
            tx,
            "libur_kantor_tidak_mundur",
            (sp) =>
              sp`insert into libur_kantor (kantor_id, tanggal, alasan_libur, dibuat_oleh)
               values (${k?.id}, ${hariIni}::date - 1, 'x', ${bos?.id})`,
          );
          await tolak(
            tx,
            "libur_kantor_tidak_mundur",
            (sp) => sp`update libur_kantor set alasan_libur = 'Lebaran' where kantor_id = ${k?.id}`,
          );
          await tolak(
            tx,
            "libur_kantor_alasan_check",
            (sp) =>
              sp`insert into libur_kantor (kantor_id, tanggal, alasan_libur, dibuat_oleh)
               values (${k?.id}, ${hariIni}::date + 4, '  ', ${bos?.id})`,
          );
          await tolak(
            tx,
            "uniq_libur_kantor_kantor_tanggal",
            (sp) =>
              sp`insert into libur_kantor (kantor_id, tanggal, alasan_libur, dibuat_oleh)
               values (${k?.id}, ${hariIni}::date + 3, 'lagi', ${bos?.id})`,
          );
          // Hari ini boleh dideklarasikan, tetapi tak bisa dibatalkan lagi.
          await tx`insert into libur_kantor (kantor_id, tanggal, alasan_libur, dibuat_oleh)
                   values (${k?.id}, ${hariIni}, 'Acara keluarga', ${bos?.id})`;
          await tolak(
            tx,
            "libur_kantor_tidak_mundur",
            (sp) =>
              sp`delete from libur_kantor where kantor_id = ${k?.id} and tanggal = ${hariIni}`,
          );
          // Tanggal yang belum tiba boleh dibatalkan.
          await tx`delete from libur_kantor where kantor_id = ${k?.id} and tanggal = ${hariIni}::date + 3`;

          // ---- kebijakan ---------------------------------------------------------
          await tx`insert into kebijakan (kantor_id, gulung_pinjaman_dikunci, alasan_kunci, diubah_oleh)
                   values (${k?.id}, true, 'Akhir bulan', ${bos?.id})`;
          await tolak(
            tx,
            "uniq_kebijakan_kantor",
            (sp) =>
              sp`insert into kebijakan (kantor_id, naik_pinjaman_dikunci, diubah_oleh) values (${k?.id}, true, ${bos?.id})`,
          );
          await tx`insert into kebijakan (kantor_id, kolektor_id, pinjaman_baru_dikunci, diubah_oleh)
                   values (${k?.id}, ${kol?.id}, true, ${bos?.id})`;
          await tolak(
            tx,
            "kebijakan_kolektor_fk",
            (sp) =>
              sp`insert into kebijakan (kantor_id, kolektor_id, naik_pinjaman_dikunci, diubah_oleh)
               values (${k?.id}, ${kasir?.id}, true, ${bos?.id})`,
          );
          await tolak(
            tx,
            "kebijakan_sasaran_check",
            (sp) =>
              sp`insert into kebijakan (kantor_id, kolektor_id, nasabah_id, naik_pinjaman_dikunci, diubah_oleh)
               values (${k?.id}, ${kol?.id}, ${n?.id}, true, ${bos?.id})`,
          );
          await tolak(
            tx,
            "kebijakan_lapis_nasabah_check",
            (sp) =>
              sp`insert into kebijakan (kantor_id, nasabah_id, pinjaman_baru_dikunci, diubah_oleh)
               values (${k?.id}, ${n?.id}, true, ${bos?.id})`,
          );
          await tolak(
            tx,
            "kebijakan_menyala_check",
            (sp) =>
              sp`insert into kebijakan (kantor_id, nasabah_id, diubah_oleh) values (${k?.id}, ${n?.id}, ${bos?.id})`,
          );
          await tx`insert into kebijakan (kantor_id, nasabah_id, gulung_pinjaman_dikunci, diubah_oleh)
                   values (${k?.id}, ${n?.id}, true, ${bos?.id})`;

          throw new Batalkan();
        })
        .catch((e) => {
          if (!(e instanceof Batalkan)) throw e;
        });
    } finally {
      await sql.end();
    }
  }, 60_000);
});
