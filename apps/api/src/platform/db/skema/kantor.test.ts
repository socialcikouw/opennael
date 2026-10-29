import { describe, expect, test } from "bun:test";
import postgres from "postgres";
import { Batalkan, tolak, URL_DB as url } from "../../../uji/skema";
import { pastikanDatabasePengembangan } from "../penjaga";

/** Uji skema (kantor, pengguna, pekan_kerja, tarif_gaji, perangkat) — lihat uji/skema.ts untuk aturan umumnya. */
describe.skipIf(!url)("skema database", () => {
  test("kantor, pengguna, pekan_kerja, tarif_gaji, perangkat menolak data salah", async () => {
    pastikanDatabasePengembangan(url);
    const sql = postgres(url as string, { prepare: false, max: 1, onnotice: () => {} });
    try {
      await sql
        .begin(async (tx) => {
          // ---- kantor ------------------------------------------------------
          const [k] =
            await tx`insert into kantor (nama) values ('Uji A') returning id, jam_buka, jam_tutup`;
          const [k2] = await tx`insert into kantor (nama) values ('Uji B') returning id`;
          expect(k?.jam_buka).toBe("07:00:00");
          expect(k?.jam_tutup).toBe("24:00:00");
          await tolak(
            tx,
            "kantor_jam_check",
            (sp) =>
              sp`insert into kantor (nama, jam_buka, jam_tutup) values ('x', '18:00', '07:00')`,
          );

          // ---- pengguna ----------------------------------------------------
          const [bos] = await tx`
            insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
            values (${k?.id}, 'bos', 'Bos A', '+6281234567890', 'hash') returning id`;
          const [bos2] = await tx`
            insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
            values (${k2?.id}, 'bos', 'Bos B', '+6281111111111', 'hash') returning id`;
          const [kol] = await tx`
            insert into pengguna (kantor_id, peran, nama, resort)
            values (${k?.id}, 'kolektor', 'Andi', 'Resort 1') returning id, kolektor_kantor_id`;
          const [kasir] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kasir', 'Sari')
            returning kolektor_kantor_id`;
          expect(kol?.kolektor_kantor_id).toBe(k?.id);
          expect(kasir?.kolektor_kantor_id).toBeNull();

          await tolak(
            tx,
            "pengguna_peran_check",
            (sp) =>
              sp`insert into pengguna (kantor_id, peran, nama, nomor_hp) values (${k2?.id}, 'bos', 'x', '+6280000000')`,
          );
          await tolak(
            tx,
            "pengguna_peran_check",
            (sp) =>
              sp`insert into pengguna (kantor_id, peran, nama, hash_sandi) values (${k?.id}, 'kolektor', 'x', 'hash')`,
          );
          await tolak(
            tx,
            "pengguna_resort_check",
            (sp) =>
              sp`insert into pengguna (kantor_id, peran, nama, resort) values (${k?.id}, 'kasir', 'x', 'R')`,
          );
          await tolak(
            tx,
            "pengguna_nomor_hp_check",
            (sp) =>
              sp`insert into pengguna (kantor_id, peran, nama, nomor_hp) values (${k?.id}, 'kasir', 'x', '081234567890')`,
          );
          await tolak(
            tx,
            "uniq_pengguna_bos_kantor",
            (sp) =>
              sp`insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
               values (${k?.id}, 'bos', 'Bos kedua', '+6289999999999', 'hash')`,
          );
          // Kantor ketiga (belum punya bos) — yang diuji hanya nomor HP kembar.
          const [k3] = await tx`insert into kantor (nama) values ('Uji C') returning id`;
          await tolak(
            tx,
            "uniq_pengguna_nomor_hp_bos",
            (sp) =>
              sp`insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
               values (${k3?.id}, 'bos', 'x', '+6281234567890', 'hash')`,
          );
          await tolak(
            tx,
            "pengguna_nonaktif_check",
            (sp) => sp`update pengguna set dinonaktifkan_at = now() where id = ${kol?.id}`,
          );
          // Penonaktif harus orang kantor yang sama.
          await tolak(
            tx,
            "pengguna_dinonaktifkan_oleh_fk",
            (sp) =>
              sp`update pengguna set dinonaktifkan_at = now(), dinonaktifkan_oleh = ${bos2?.id},
                 alasan_nonaktif = 'x' where id = ${kol?.id}`,
          );

          // `diubah_at` disentuh database, bukan kode aplikasi.
          await tx`update pengguna set diubah_at = '2000-01-01' where id = ${kol?.id}`;
          const [ubah] = await tx`select extract(year from diubah_at)::int as tahun
                                  from pengguna where id = ${kol?.id}`;
          expect(ubah?.tahun).toBeGreaterThan(2000);

          // ---- pekan_kerja -------------------------------------------------
          const [hari] = await tx`select kantor_hari_ini(${k?.id}) as h`;
          const hariIni = hari?.h as Date;
          await tx`insert into pekan_kerja (kantor_id, berlaku_mulai, hari_kerja, dibuat_oleh)
                   values (${k?.id}, ${hariIni}, 126, ${bos?.id})`;
          await tolak(
            tx,
            "pekan_kerja_tidak_mundur",
            (sp) =>
              sp`insert into pekan_kerja (kantor_id, berlaku_mulai, hari_kerja, dibuat_oleh)
               values (${k?.id}, ${hariIni}::date - 1, 126, ${bos?.id})`,
          );
          await tolak(
            tx,
            "pekan_kerja_hari_check",
            (sp) =>
              sp`insert into pekan_kerja (kantor_id, berlaku_mulai, hari_kerja, dibuat_oleh)
               values (${k?.id}, ${hariIni}::date + 1, 0, ${bos?.id})`,
          );
          await tolak(
            tx,
            "pekan_kerja_dibuat_oleh_fk",
            (sp) =>
              sp`insert into pekan_kerja (kantor_id, berlaku_mulai, hari_kerja, dibuat_oleh)
               values (${k?.id}, ${hariIni}::date + 2, 62, ${bos2?.id})`,
          );

          // Migrasi data lama boleh mengisi masa lalu; sesudah itu terkunci.
          await tx.savepoint(async (sp) => {
            await sp`select set_config('nael.migrasi_data', 'ya', true)`;
            await sp`insert into pekan_kerja (kantor_id, berlaku_mulai, hari_kerja, dibuat_oleh)
                     values (${k?.id}, '2020-01-01', 126, ${bos?.id})`;
            await sp`select set_config('nael.migrasi_data', '', true)`;
          });
          await tolak(
            tx,
            "pekan_kerja_tidak_mundur",
            (sp) =>
              sp`update pekan_kerja set hari_kerja = 62 where kantor_id = ${k?.id} and berlaku_mulai = '2020-01-01'`,
          );
          await tolak(
            tx,
            "pekan_kerja_tidak_mundur",
            (sp) =>
              sp`delete from pekan_kerja where kantor_id = ${k?.id} and berlaku_mulai = '2020-01-01'`,
          );
          // Pola hari ini masih boleh ditimpa (salah ketik sebelum berlaku penuh).
          await tx`update pekan_kerja set hari_kerja = 62 where kantor_id = ${k?.id} and berlaku_mulai = ${hariIni}`;

          // ---- tarif_gaji --------------------------------------------------
          await tx`insert into tarif_gaji (kantor_id, tarif_bp, berlaku_mulai, dibuat_oleh)
                   values (${k?.id}, 500, ${hariIni}, ${bos?.id})`;
          await tolak(
            tx,
            "uniq_tarif_gaji_kantor",
            (sp) =>
              sp`insert into tarif_gaji (kantor_id, tarif_bp, berlaku_mulai, dibuat_oleh)
               values (${k?.id}, 600, ${hariIni}, ${bos?.id})`,
          );
          await tolak(
            tx,
            "tarif_gaji_tarif_check",
            (sp) =>
              sp`insert into tarif_gaji (kantor_id, tarif_bp, berlaku_mulai, dibuat_oleh)
               values (${k?.id}, null, ${hariIni}::date + 1, ${bos?.id})`,
          );
          await tolak(
            tx,
            "tarif_gaji_tarif_check",
            (sp) =>
              sp`insert into tarif_gaji (kantor_id, tarif_bp, berlaku_mulai, dibuat_oleh)
               values (${k?.id}, 10001, ${hariIni}::date + 1, ${bos?.id})`,
          );
          await tolak(
            tx,
            "tarif_gaji_tidak_mundur",
            (sp) =>
              sp`insert into tarif_gaji (kantor_id, tarif_bp, berlaku_mulai, dibuat_oleh)
               values (${k?.id}, 500, ${hariIni}::date - 1, ${bos?.id})`,
          );
          // Tarif khusus kolektor: kosong = kembali ikut tarif kantor.
          await tx`insert into tarif_gaji (kantor_id, kolektor_id, tarif_bp, berlaku_mulai, dibuat_oleh)
                   values (${k?.id}, ${kol?.id}, null, ${hariIni}::date + 7, ${bos?.id})`;
          // Sasaran tarif khusus harus KOLEKTOR kantor itu (bukan bos/kasir).
          await tolak(
            tx,
            "tarif_gaji_kolektor_fk",
            (sp) =>
              sp`insert into tarif_gaji (kantor_id, kolektor_id, tarif_bp, berlaku_mulai, dibuat_oleh)
               values (${k?.id}, ${bos?.id}, 600, ${hariIni}::date + 7, ${bos?.id})`,
          );

          // ---- perangkat ---------------------------------------------------
          const [dev] = await tx`
            insert into perangkat (pengguna_id, kantor_id, kedaluwarsa_at)
            values (${bos?.id}, ${k?.id}, now() + interval '90 days') returning id`;
          await tolak(
            tx,
            "perangkat_pengguna_fk",
            (sp) =>
              sp`insert into perangkat (pengguna_id, kantor_id, kedaluwarsa_at)
               values (${bos?.id}, ${k2?.id}, now())`,
          );
          // Putus selalu beralasan; pelaku wajib untuk alasan orang, kosong untuk sistem.
          await tolak(
            tx,
            "perangkat_putus_check",
            (sp) => sp`update perangkat set diputus_at = now() where id = ${dev?.id}`,
          );
          await tolak(
            tx,
            "perangkat_putus_check",
            (sp) =>
              sp`update perangkat set diputus_at = now(), alasan_putus = 'diputus' where id = ${dev?.id}`,
          );
          await tolak(
            tx,
            "perangkat_putus_check",
            (sp) =>
              sp`update perangkat set diputus_at = now(), alasan_putus = 'kedaluwarsa', diputus_oleh = ${bos?.id}
               where id = ${dev?.id}`,
          );
          await tx`update perangkat set diputus_at = now(), alasan_putus = 'pakai_ulang' where id = ${dev?.id}`;

          // ---- tautan ------------------------------------------------------
          const [tt] = await tx`
            insert into tautan (kode, hash_klaim, kedaluwarsa_at)
            values ('K7QM28XD', ${"a".repeat(64)}, now() + interval '2 minutes') returning id`;
          await tolak(
            tx,
            "uniq_tautan_kode",
            (sp) =>
              sp`insert into tautan (kode, hash_klaim, kedaluwarsa_at) values ('K7QM28XD', 'x', now())`,
          );
          // Persetujuan: keempat kolom bersamaan; dipakai hanya sesudah disetujui.
          await tolak(
            tx,
            "tautan_setuju_check",
            (sp) => sp`update tautan set disetujui_at = now() where id = ${tt?.id}`,
          );
          await tolak(
            tx,
            "tautan_pakai_check",
            (sp) => sp`update tautan set perangkat_id = ${dev?.id} where id = ${tt?.id}`,
          );
          await tolak(
            tx,
            "tautan_pengguna_fk",
            (sp) =>
              sp`update tautan set kantor_id = ${k2?.id}, pengguna_id = ${kol?.id}, disetujui_at = now(),
                 disetujui_oleh = ${bos2?.id} where id = ${tt?.id}`,
          );

          // ---- riwayat_perubahan -------------------------------------------
          const [jejak] = await tx`
            insert into riwayat_perubahan (kantor_id, tabel, baris_id, aksi, sesudah, pelaku_id)
            values (${k?.id}, 'pengguna', ${kol?.id}, 'buat_pengguna', '{"nama":"Andi"}', ${bos?.id}) returning id`;
          await tolak(
            tx,
            "riwayat_perubahan_append_only",
            (sp) => sp`update riwayat_perubahan set aksi = 'lain' where id = ${jejak?.id}`,
          );
          await tolak(
            tx,
            "riwayat_perubahan_append_only",
            (sp) => sp`delete from riwayat_perubahan where id = ${jejak?.id}`,
          );
          await tolak(
            tx,
            "riwayat_perubahan_aksi_check",
            (sp) =>
              sp`insert into riwayat_perubahan (kantor_id, tabel, baris_id, aksi, sesudah, pelaku_id)
               values (${k?.id}, 'pengguna', ${kol?.id}, 'Aksi Salah', '{}', ${bos?.id})`,
          );
          await tolak(
            tx,
            "riwayat_perubahan_isi_check",
            (sp) =>
              sp`insert into riwayat_perubahan (kantor_id, tabel, baris_id, aksi, pelaku_id)
               values (${k?.id}, 'pengguna', ${kol?.id}, 'kosong', ${bos?.id})`,
          );
          await tolak(
            tx,
            "riwayat_perubahan_pelaku_fk",
            (sp) =>
              sp`insert into riwayat_perubahan (kantor_id, tabel, baris_id, aksi, sesudah, pelaku_id)
               values (${k?.id}, 'pengguna', ${kol?.id}, 'x', '{}', ${bos2?.id})`,
          );
          // Skrip data uji boleh menghapus jejak, hanya di transaksinya sendiri.
          await tx.savepoint(async (sp) => {
            await sp`select set_config('nael.hapus_data_uji', 'ya', true)`;
            await sp`delete from riwayat_perubahan where id = ${jejak?.id}`;
            await sp`select set_config('nael.hapus_data_uji', '', true)`;
          });

          throw new Batalkan();
        })
        .catch((e) => {
          if (!(e instanceof Batalkan)) throw e;
        });
    } finally {
      await sql.end();
    }
  }, 30_000);
});
