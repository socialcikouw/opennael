import { describe, expect, test } from "bun:test";
import postgres from "postgres";
import { pastikanDatabasePengembangan } from "./penjaga";

/**
 * UJI SKEMA — database sendiri yang menolak data salah (CHECK, FK, UNIQUE,
 * trigger), bukan hanya service. Semua berjalan di SATU transaksi yang
 * dibatalkan di akhir: database pengembangan tidak berubah.
 *
 * Butuh `DATABASE_URL` Supabase pengembangan (`apps/api/.env`); tanpa itu
 * dilewati.
 */
const url = process.env.DATABASE_URL;

class Batalkan extends Error {}

type Tx = postgres.TransactionSql;

describe.skipIf(!url)("skema operasi idempoten", () => {
  test("hasil sah; CHECK, UNIQUE dan FK lintas kantor menolak data salah", async () => {
    pastikanDatabasePengembangan(url);
    const db = postgres(url as string, { prepare: false, max: 1 });
    try {
      await db.begin(async (tx) => {
        const [k] = await tx`insert into kantor (nama) values ('Uji idempoten A') returning id`;
        const [lain] = await tx`insert into kantor (nama) values ('Uji idempoten B') returning id`;
        const [p] =
          await tx`insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kolektor', 'Uji') returning id`;
        const kunci = crypto.randomUUID();
        const sidik = "a".repeat(64);
        const isi = {
          kantor_id: k?.id,
          pengguna_id: p?.id,
          kunci,
          operasi: "kas/buka",
          sidik_isi: sidik,
          hasil: { id: 1 },
        };
        const sisip = (sp: Tx, ubah: Partial<typeof isi> = {}) =>
          sp`insert into operasi_idempoten ${sp({ ...isi, ...ubah })}`;
        await sisip(tx);
        await tolak(tx, "uniq_operasi_idempoten_pelaku_kunci", (sp) => sisip(sp));
        await tolak(tx, "operasi_idempoten_operasi_check", (sp) =>
          sisip(sp, { kunci: crypto.randomUUID(), operasi: " " }),
        );
        await tolak(tx, "operasi_idempoten_sidik_isi_check", (sp) =>
          sisip(sp, { kunci: crypto.randomUUID(), sidik_isi: "bukan-hash" }),
        );
        await tolak(tx, "operasi_idempoten_kantor_fk", (sp) =>
          sisip(sp, { kantor_id: crypto.randomUUID() }),
        );
        await tolak(tx, "operasi_idempoten_pengguna_kantor_fk", (sp) =>
          sisip(sp, { kantor_id: lain?.id }),
        );
        await tolak(tx, "operasi_idempoten_pengguna_kantor_fk", (sp) =>
          sisip(sp, { pengguna_id: crypto.randomUUID() }),
        );
        throw new Batalkan();
      });
    } catch (e) {
      if (!(e instanceof Batalkan)) throw e;
    } finally {
      await db.end();
    }
  }, 30000);
});

/** Pernyataan harus ditolak database dengan nama constraint itu. */
async function tolak(tx: Tx, constraint: string, jalankan: (sp: Tx) => Promise<unknown>) {
  let galat: unknown;
  try {
    await tx.savepoint((sp) => jalankan(sp as unknown as Tx));
  } catch (e) {
    galat = e;
  }
  expect(galat, `harus ditolak ${constraint}`).toBeInstanceOf(postgres.PostgresError);
  expect((galat as postgres.PostgresError).constraint_name).toBe(constraint);
}

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

  test("wilayah, foto, nasabah menolak data salah", async () => {
    pastikanDatabasePengembangan(url);
    const sql = postgres(url as string, { prepare: false, max: 1, onnotice: () => {} });
    const sha = (c: string) => c.repeat(64);
    try {
      await sql
        .begin(async (tx) => {
          const [k] = await tx`insert into kantor (nama) values ('Uji A') returning id`;
          const [k2] = await tx`insert into kantor (nama) values ('Uji B') returning id`;
          const [bos] = await tx`
            insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
            values (${k?.id}, 'bos', 'Bos A', '+6281234567890', 'hash') returning id`;
          const [bos2] = await tx`
            insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
            values (${k2?.id}, 'bos', 'Bos B', '+6281111111111', 'hash') returning id`;
          const [kol] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kolektor', 'Andi') returning id`;

          // ---- wilayah -----------------------------------------------------
          const [w] = await tx`
            insert into wilayah (kantor_id, nama, dibuat_oleh)
            values (${k?.id}, 'Pule Barat', ${kol?.id}) returning id, kunci`;
          expect(w?.kunci).toBe("pule barat");
          await tolak(
            tx,
            "uniq_wilayah_kantor_kunci",
            (sp) =>
              sp`insert into wilayah (kantor_id, nama, dibuat_oleh) values (${k?.id}, 'PULE BARAT', ${bos?.id})`,
          );
          for (const nama of ["", " Pule", "Pule  Barat"]) {
            await tolak(
              tx,
              "wilayah_nama_check",
              (sp) =>
                sp`insert into wilayah (kantor_id, nama, dibuat_oleh) values (${k?.id}, ${nama}, ${bos?.id})`,
            );
          }
          // Kantor lain boleh punya kampung bernama sama.
          const [w2] = await tx`
            insert into wilayah (kantor_id, nama, dibuat_oleh)
            values (${k2?.id}, 'Pule Barat', ${bos2?.id}) returning id`;
          await tolak(
            tx,
            "wilayah_dibuat_oleh_fk",
            (sp) =>
              sp`insert into wilayah (kantor_id, nama, dibuat_oleh) values (${k?.id}, 'Pasar', ${bos2?.id})`,
          );

          // ---- foto --------------------------------------------------------
          const fotoBaru = (
            sp: Tx,
            kantor: unknown,
            oleh: unknown,
            isi: Record<string, unknown> = {},
          ) =>
            sp`insert into foto ${sp({
              kantor_id: kantor,
              jenis: "ktp",
              kunci_berkas: "kantor/uji/foto/1.webp",
              sha256: sha("a"),
              ukuran_byte: 150_000,
              tipe_mime: "image/webp",
              diunggah_oleh: oleh,
              ...isi,
            } as Record<string, postgres.ParameterOrJSON<never>>)} returning id`;
          const [f] = (await fotoBaru(tx, k?.id, kol?.id)) as unknown as postgres.Row[];
          await tolak(tx, "uniq_foto_kantor_sha256", (sp) => fotoBaru(sp, k?.id, bos?.id));
          const [fLain] = (await fotoBaru(tx, k2?.id, bos2?.id)) as unknown as postgres.Row[];
          await tolak(tx, "foto_ukuran_check", (sp) =>
            fotoBaru(sp, k?.id, kol?.id, { sha256: sha("b"), ukuran_byte: 0 }),
          );
          await tolak(tx, "foto_ukuran_check", (sp) =>
            fotoBaru(sp, k?.id, kol?.id, { sha256: sha("b"), ukuran_byte: 2_000_001 }),
          );
          await tolak(tx, "foto_sha256_check", (sp) =>
            fotoBaru(sp, k?.id, kol?.id, { sha256: sha("X") }),
          );
          await tolak(tx, "foto_lokasi_check", (sp) =>
            fotoBaru(sp, k?.id, kol?.id, { sha256: sha("c"), latitude: -7.5, longitude: 110.4 }),
          );
          await tolak(tx, "foto_lokasi_check", (sp) =>
            fotoBaru(sp, k?.id, kol?.id, {
              sha256: sha("c"),
              latitude: 40,
              longitude: 110.4,
              akurasi_meter: 10,
            }),
          );
          await tolak(tx, "foto_diunggah_oleh_fk", (sp) =>
            fotoBaru(sp, k?.id, bos2?.id, { sha256: sha("d") }),
          );

          // ---- nasabah -----------------------------------------------------
          const nasabahBaru = (sp: Tx, isi: Record<string, unknown> = {}) =>
            sp`insert into nasabah ${sp({
              kantor_id: k?.id,
              kolektor_id: kol?.id,
              nama: "Sari",
              wilayah_id: w?.id,
              ...isi,
            } as Record<string, postgres.ParameterOrJSON<never>>)} returning id`;
          const [n] = (await nasabahBaru(tx, {
            nik: "3201010101010001",
            nomor_hp: "+6281299990003",
            latitude: -7.5,
            longitude: 110.4,
            akurasi_meter: 8,
            foto_ktp_id: f?.id,
          })) as unknown as postgres.Row[];
          await tolak(tx, "nasabah_kolektor_fk", (sp) => nasabahBaru(sp, { kolektor_id: bos?.id }));
          await tolak(tx, "nasabah_wilayah_fk", (sp) => nasabahBaru(sp, { wilayah_id: w2?.id }));
          await tolak(tx, "nasabah_foto_ktp_fk", (sp) =>
            nasabahBaru(sp, { foto_ktp_id: fLain?.id }),
          );
          await tolak(tx, "uniq_nasabah_kantor_nik", (sp) =>
            nasabahBaru(sp, { nik: "3201010101010001" }),
          );
          await tolak(tx, "nasabah_nik_check", (sp) => nasabahBaru(sp, { nik: "32010101" }));
          await tolak(tx, "nasabah_nomor_hp_check", (sp) =>
            nasabahBaru(sp, { nomor_hp: "081299990003" }),
          );
          await tolak(tx, "nasabah_saldo_tabungan_check", (sp) =>
            nasabahBaru(sp, { saldo_tabungan: -1 }),
          );
          await tolak(tx, "nasabah_lokasi_check", (sp) => nasabahBaru(sp, { latitude: -7.5 }));
          await tolak(
            tx,
            "nasabah_blokir_check",
            (sp) => sp`update nasabah set diblokir_at = now() where id = ${n?.id}`,
          );
          await tolak(
            tx,
            "nasabah_diblokir_oleh_fk",
            (sp) =>
              sp`update nasabah set diblokir_at = now(), diblokir_oleh = ${bos2?.id}, alasan_blokir = 'x'
               where id = ${n?.id}`,
          );
          // Nama kembar & tanpa NIK boleh (orang berbeda).
          await nasabahBaru(tx);
          await nasabahBaru(tx);

          // Kampung yang masih dipakai nasabah tak bisa dihapus.
          await tolak(
            tx,
            "nasabah_wilayah_fk",
            (sp) => sp`delete from wilayah where id = ${w?.id}`,
          );

          // `diubah_at` disentuh database.
          await tx`update nasabah set diubah_at = '2000-01-01' where id = ${n?.id}`;
          const [ubah] =
            await tx`select extract(year from diubah_at)::int as tahun from nasabah where id = ${n?.id}`;
          expect(ubah?.tahun).toBeGreaterThan(2000);

          throw new Batalkan();
        })
        .catch((e) => {
          if (!(e instanceof Batalkan)) throw e;
        });
    } finally {
      await sql.end();
    }
  }, 30_000);
  test("pinjaman, transaksi, riwayat_status_pinjaman menolak data salah", async () => {
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
          const [w] = await tx`
            insert into wilayah (kantor_id, nama, dibuat_oleh) values (${k?.id}, 'Pule', ${kol?.id}) returning id`;
          const nasabahBaru = async (nama: string) =>
            (
              await tx`insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
                       values (${k?.id}, ${kol?.id}, ${nama}, ${w?.id}) returning id`
            )[0]?.id as string;
          let nomorFoto = 0;
          const fotoBaru = async () =>
            (
              await tx`insert into foto (kantor_id, jenis, kunci_berkas, sha256, ukuran_byte, tipe_mime, diunggah_oleh)
                       values (${k?.id}, 'serah_terima', 'f', ${String(++nomorFoto).padStart(64, "0")},
                               1000, 'image/webp', ${kol?.id}) returning id`
            )[0]?.id as string;
          const n1 = await nasabahBaru("Sari");
          const n2 = await nasabahBaru("Budi");

          // Akad harian pokok 1 jt (aturan-usaha A5).
          const akad = (isi: Record<string, unknown>) => ({
            kantor_id: k?.id,
            pencair_id: kol?.id,
            dibuat_oleh: kol?.id,
            nasabah_id: n1,
            pinjaman_ke: 1,
            jenis: "harian",
            tenor: 24,
            asal: "baru",
            tanggal_akad: "2026-10-01",
            pokok: 1_000_000,
            potongan_admin: 50_000,
            tabungan_masuk: 50_000,
            pencairan: 900_000,
            total_kembali: 1_200_000,
            angsuran: 50_000,
            saldo_awal: 1_200_000,
            drop_baru: 1_000_000,
            saldo: 1_200_000,
            ...isi,
          });
          const masuk = (sp: Tx, isi: Record<string, unknown>) =>
            sp`insert into pinjaman ${sp(akad(isi) as Record<string, postgres.ParameterOrJSON<never>>)} returning *`;

          const [p] = (await masuk(tx, {
            foto_serah_terima_id: await fotoBaru(),
          })) as unknown as postgres.Row[];
          expect(p?.droping).toBe("1000000");
          expect(p?.angsuran_ke).toBe(0);
          expect(p?.jatuh_tempo).toBeNull();
          const lahir = await tx`select status_sebelum, status_sesudah, tanggal::text as tanggal
                                 from riwayat_status_pinjaman where pinjaman_id = ${p?.id}`;
          expect([...lahir]).toEqual([
            { status_sebelum: null, status_sesudah: "berjalan", tanggal: "2026-10-01" },
          ]);

          await tolak(tx, "pinjaman_foto_check", (sp) => masuk(sp, { nasabah_id: n2 }));
          const fotoLain = await fotoBaru();
          await tolak(tx, "uniq_pinjaman_aktif_nasabah", (sp) =>
            masuk(sp, { pinjaman_ke: 2, foto_serah_terima_id: fotoLain }),
          );
          await tolak(tx, "uniq_pinjaman_foto", (sp) =>
            masuk(sp, { nasabah_id: n2, foto_serah_terima_id: p?.foto_serah_terima_id }),
          );
          const salah = async (constraint: string, isi: Record<string, unknown>) => {
            const fotoId = await fotoBaru();
            await tolak(tx, constraint, (sp) =>
              masuk(sp, { nasabah_id: n2, foto_serah_terima_id: fotoId, ...isi }),
            );
          };
          await salah("pinjaman_pokok_check", {
            pokok: 1_050_000,
            pencairan: 950_000,
            drop_baru: 1_050_000,
          });
          await salah("pinjaman_tenor_check", { tenor: 20, angsuran: 60_000 });
          await salah("pinjaman_pencairan_check", { pencairan: 950_000 });
          await salah("pinjaman_angsuran_check", { angsuran: 40_000 });
          await salah("pinjaman_saldo_check", { saldo: 1_300_000 });
          await salah("pinjaman_status_check", { status: "lunas", tanggal_selesai: "2026-10-02" });
          await salah("pinjaman_macet_check", { status: "macet" });
          await salah("pinjaman_batal_check", { status: "batal", tanggal_selesai: "2026-10-01" });
          await salah("pinjaman_gulung_check", { asal: "gulung" });
          await salah("pinjaman_disalin_check", { tanggal_disalin: "2026-10-05" });
          await salah("pinjaman_pencair_fk", { pencair_id: bos?.id });
          // Gulung hanya dari pinjaman nasabah yang sama.
          await salah("pinjaman_asal_fk", {
            asal: "gulung",
            jenis_gulung: "tetap",
            pinjaman_asal_id: p?.id,
            saldo_lama: 100_000,
            pencairan: 800_000,
            drop_baru: 0,
            drop_gulung: 1_000_000,
          });

          // Salinan migrasi: tanpa uang keluar & tanpa foto.
          const [m] = (await masuk(tx, {
            nasabah_id: n2,
            asal: "migrasi",
            tanggal_disalin: "2026-10-05",
            potongan_admin: 0,
            pencairan: 0,
            drop_baru: 0,
            saldo_awal: 600_000,
            saldo: 600_000,
          })) as unknown as postgres.Row[];
          expect(m?.angsuran_ke).toBe(12);

          // Tempoan: jatuh tempo = akad + tenor.
          const n3 = await nasabahBaru("Tono");
          const fotoTempo = await fotoBaru();
          const [tp] = (await masuk(tx, {
            nasabah_id: n3,
            jenis: "tempoan",
            tenor: 14,
            potongan_admin: 0,
            tabungan_masuk: 0,
            pencairan: 1_000_000,
            total_kembali: 1_250_000,
            angsuran: 1_250_000,
            saldo_awal: 1_250_000,
            saldo: 1_250_000,
            foto_serah_terima_id: fotoTempo,
          })) as unknown as postgres.Row[];
          expect(new Date(tp?.jatuh_tempo).toISOString().slice(0, 10)).toBe("2026-10-15");

          // ---- transaksi ---------------------------------------------------
          const setor = (sp: Tx, isi: Record<string, unknown>) =>
            sp`insert into transaksi ${sp({
              kantor_id: k?.id,
              pencatat_id: kol?.id,
              pinjaman_id: p?.id,
              tanggal: "2026-10-02",
              jenis: "angsuran",
              setoran_murni: 50_000,
              saldo_sesudah: 1_150_000,
              ...isi,
            } as Record<string, postgres.ParameterOrJSON<never>>)} returning *`;
          const [t] = (await setor(tx, {})) as unknown as postgres.Row[];
          expect(t?.storting).toBe("50000");
          await tolak(tx, "uniq_transaksi_pinjaman_tanggal", (sp) => setor(sp, {}));
          await tolak(tx, "transaksi_pencatat_fk", (sp) =>
            setor(sp, { tanggal: "2026-10-03", pencatat_id: bos?.id }),
          );
          await tolak(tx, "transaksi_nominal_check", (sp) =>
            setor(sp, { tanggal: "2026-10-03", setoran_murni: 0 }),
          );
          await tolak(tx, "transaksi_jenis_check", (sp) =>
            setor(sp, { tanggal: "2026-10-03", tabungan_keluar: 10_000 }),
          );
          await tolak(tx, "transaksi_jenis_check", (sp) =>
            setor(sp, { tanggal: "2026-10-03", jenis: "pelunasan", saldo_sesudah: 100 }),
          );
          // Hanya bertambah: nominal tak bisa disunting, baris tak bisa dihapus.
          await tolak(
            tx,
            "transaksi_append_only",
            (sp) => sp`update transaksi set setoran_murni = 60000 where id = ${t?.id}`,
          );
          await tolak(
            tx,
            "transaksi_append_only",
            (sp) => sp`delete from transaksi where id = ${t?.id}`,
          );
          await tolak(
            tx,
            "transaksi_batal_check",
            (sp) => sp`update transaksi set dibatalkan_at = now() where id = ${t?.id}`,
          );
          await tx`update transaksi set dibatalkan_at = now(), dibatalkan_oleh = ${bos?.id},
                   alasan_batal = 'salah ketik' where id = ${t?.id}`;
          await tolak(
            tx,
            "transaksi_append_only",
            (sp) => sp`update transaksi set alasan_batal = 'lain' where id = ${t?.id}`,
          );
          // Sesudah batal, hari yang sama boleh dicatat ulang.
          await setor(tx, {});
          // Pelunasan bertabungan lebih: storting negatif (aturan-usaha D2).
          const [lunas] = (await setor(tx, {
            pinjaman_id: m?.id,
            jenis: "pelunasan",
            setoran_murni: 0,
            setoran_pelunasan: 600_000,
            tabungan_keluar: 800_000,
            saldo_sesudah: 0,
          })) as unknown as postgres.Row[];
          expect(lunas?.storting).toBe("-200000");

          // ---- riwayat status ----------------------------------------------
          await tx`update pinjaman set status = 'macet', tanggal_macet = '2026-10-20' where id = ${p?.id}`;
          // Pulih tanpa tanggal pembukuan → galat (cadangan "hari ini" pasti meleset).
          await tolak(
            tx,
            "riwayat_status_pinjaman_tanggal",
            (sp) =>
              sp`update pinjaman set status = 'berjalan', tanggal_macet = null where id = ${p?.id}`,
          );
          await tx.savepoint(async (sp) => {
            await sp`select set_config('nael.tanggal_pembukuan', '2026-10-22', true)`;
            await sp`update pinjaman set status = 'berjalan', tanggal_macet = null where id = ${p?.id}`;
            await sp`select set_config('nael.tanggal_pembukuan', '', true)`;
          });
          const jalan = await tx`
            select coalesce(status_sebelum::text, '-') || '>' || status_sesudah || '@' || tanggal as j
            from riwayat_status_pinjaman where pinjaman_id = ${p?.id} order by dibuat_at`;
          expect(jalan.map((r) => r.j)).toEqual([
            "->berjalan@2026-10-01",
            "berjalan>macet@2026-10-20",
            "macet>berjalan@2026-10-22",
          ]);
          const [rs] =
            await tx`select id from riwayat_status_pinjaman where pinjaman_id = ${p?.id} limit 1`;
          await tolak(
            tx,
            "riwayat_status_pinjaman_append_only",
            (sp) =>
              sp`update riwayat_status_pinjaman set tanggal = '2026-01-01' where id = ${rs?.id}`,
          );
          await tolak(
            tx,
            "uniq_riwayat_status_pinjaman_lahir",
            (sp) =>
              sp`insert into riwayat_status_pinjaman (kantor_id, pinjaman_id, status_sesudah, tanggal)
               values (${k?.id}, ${p?.id}, 'berjalan', '2026-10-01')`,
          );
          await tolak(
            tx,
            "riwayat_status_pinjaman_urutan_check",
            (sp) =>
              sp`insert into riwayat_status_pinjaman (kantor_id, pinjaman_id, status_sebelum, status_sesudah, tanggal)
               values (${k?.id}, ${p?.id}, 'macet', 'macet', '2026-10-01')`,
          );

          throw new Batalkan();
        })
        .catch((e) => {
          if (!(e instanceof Batalkan)) throw e;
        });
    } finally {
      await sql.end();
    }
  }, 60_000);
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

  test("serah_terima_kas, transfer_setoran, biaya_tak_terduga menolak data salah", async () => {
    pastikanDatabasePengembangan(url);
    const sql = postgres(url as string, { prepare: false, max: 1, onnotice: () => {} });
    try {
      await sql
        .begin(async (tx) => {
          const [k] = await tx`insert into kantor (nama) values ('Uji A') returning id`;
          const [k2] = await tx`insert into kantor (nama) values ('Uji B') returning id`;
          const [bos] = await tx`
            insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
            values (${k?.id}, 'bos', 'Bos A', '+6281234567890', 'hash') returning id`;
          const [bos2] = await tx`
            insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
            values (${k2?.id}, 'bos', 'Bos B', '+6281111111111', 'hash') returning id`;
          const [kol] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kolektor', 'Andi') returning id`;
          const [kol2] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kolektor', 'Dedi') returning id`;
          const [kasir] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kasir', 'Sari') returning id`;
          const [w] = await tx`
            insert into wilayah (kantor_id, nama, dibuat_oleh) values (${k?.id}, 'Pule', ${kol?.id}) returning id`;
          // Pinjaman salinan migrasi (tanpa foto), saldo 600.000.
          const pinjamanBaru = async (nama: string) => {
            const [n] = await tx`
              insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
              values (${k?.id}, ${kol?.id}, ${nama}, ${w?.id}) returning id`;
            const [p] = await tx`
              insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
                asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
                total_kembali, angsuran, saldo_awal, drop_baru, saldo)
              values (${k?.id}, ${kol?.id}, ${bos?.id}, ${n?.id}, 1, 'harian', 24, 'migrasi', '2026-09-01',
                '2026-10-01', 1000000, 0, 500000, 0, 1200000, 50000, 600000, 0, 600000) returning id`;
            return p?.id as string;
          };
          const setor = async (pinjamanId: string, isi: Record<string, unknown>) =>
            (
              await tx`insert into transaksi ${tx({
                kantor_id: k?.id,
                pencatat_id: kol?.id,
                pinjaman_id: pinjamanId,
                tanggal: "2026-10-02",
                jenis: "angsuran",
                ...isi,
              } as Record<string, postgres.ParameterOrJSON<never>>)} returning id`
            )[0]?.id as string;
          const p1 = await pinjamanBaru("Budi");
          // Hari Andi: kas lapangan 1 jt, uang jalan 50 rb; laporan belum dibuka.
          const [hk] = await tx`
            insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi, kas_lapangan, uang_jalan)
            values (${k?.id}, ${kol?.id}, '2026-10-02', 'masuk_kerja', 1000000, 50000) returning id`;
          const [hkLibur] = await tx`
            insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi, alasan_tidak_kerja)
            values (${k?.id}, ${kol2?.id}, '2026-10-02', 'tidak_kerja', 'sakit') returning id`;
          const tAngsuran = await setor(p1, {
            setoran_murni: 50_000,
            setoran_pelunasan: 10_000,
            saldo_sesudah: 540_000,
          });
          const tLunas = await setor(await pinjamanBaru("Sari"), {
            jenis: "pelunasan",
            setoran_murni: 100_000,
            setoran_pelunasan: 500_000,
            tabungan_keluar: 500_000,
            saldo_sesudah: 0,
          });
          const tGulung = await setor(await pinjamanBaru("Tono"), {
            jenis: "gulung",
            setoran_pelunasan: 600_000,
            saldo_sesudah: 0,
          });
          const tLain = await setor(await pinjamanBaru("Rina"), {
            setoran_murni: 50_000,
            saldo_sesudah: 550_000,
          });
          const tBatal = await setor(p1, {
            tanggal: "2026-10-01",
            setoran_murni: 50_000,
            saldo_sesudah: 550_000,
          });
          await tx`update transaksi set dibatalkan_at = now(), dibatalkan_oleh = ${bos?.id},
                   alasan_batal = 'salah' where id = ${tBatal}`;

          // ---- transfer_setoran ---------------------------------------------
          const transfer = (sp: Tx, isi: Record<string, unknown>) =>
            sp`insert into transfer_setoran ${sp({
              kantor_id: k?.id,
              dibuat_oleh: kasir?.id,
              ...isi,
            } as Record<string, postgres.ParameterOrJSON<never>>)} returning id`;
          // Angsuran: batas = murni + pelunasan (aturan-usaha I3).
          const [tf] = (await transfer(tx, {
            transaksi_id: tAngsuran,
            nominal: 60_000,
          })) as unknown as postgres.Row[];
          await tolak(tx, "uniq_transfer_setoran_transaksi", (sp) =>
            transfer(sp, { transaksi_id: tAngsuran, nominal: 1 }),
          );
          // Pelunasan: batas = setoran murni saja (bagian tabungan bukan uang nasabah).
          await tolak(tx, "transfer_setoran_batas", (sp) =>
            transfer(sp, { transaksi_id: tLunas, nominal: 100_001 }),
          );
          await transfer(tx, { transaksi_id: tLunas, nominal: 100_000 });
          await tolak(tx, "transfer_setoran_batas", (sp) =>
            transfer(sp, { transaksi_id: tGulung, nominal: 1 }),
          );
          await tolak(tx, "transfer_setoran_batas", (sp) =>
            transfer(sp, { transaksi_id: tBatal, nominal: 1 }),
          );
          await tolak(tx, "transfer_setoran_nominal_check", (sp) =>
            transfer(sp, { transaksi_id: tGulung, nominal: 0 }),
          );
          await tolak(tx, "transfer_setoran_transaksi_fk", (sp) =>
            transfer(sp, {
              kantor_id: k2?.id,
              dibuat_oleh: bos2?.id,
              transaksi_id: tLain,
              nominal: 1,
            }),
          );
          await tolak(tx, "transfer_setoran_dibuat_oleh_fk", (sp) =>
            transfer(sp, { dibuat_oleh: bos2?.id, transaksi_id: tLain, nominal: 1 }),
          );
          await tolak(
            tx,
            "transfer_setoran_append_only",
            (sp) => sp`update transfer_setoran set nominal = 50000 where id = ${tf?.id}`,
          );
          await tolak(
            tx,
            "transfer_setoran_append_only",
            (sp) => sp`delete from transfer_setoran where id = ${tf?.id}`,
          );
          await tolak(
            tx,
            "transfer_setoran_batal_check",
            (sp) => sp`update transfer_setoran set dibatalkan_at = now() where id = ${tf?.id}`,
          );
          await tx`update transfer_setoran set dibatalkan_at = now(), dibatalkan_oleh = ${bos?.id},
                   alasan_batal = 'salah nasabah' where id = ${tf?.id}`;
          // Sesudah batal, setoran yang sama boleh dicatat ulang.
          const [tf2] = (await transfer(tx, {
            transaksi_id: tAngsuran,
            nominal: 50_000,
          })) as unknown as postgres.Row[];

          // ---- biaya_tak_terduga --------------------------------------------
          const biaya = (sp: Tx, isi: Record<string, unknown>) =>
            sp`insert into biaya_tak_terduga ${sp({
              kantor_id: k?.id,
              kolektor_id: kol?.id,
              tanggal: "2026-10-02",
              nominal: 30_000,
              keterangan: "ganti ban dalam",
              dibuat_oleh: kasir?.id,
              ...isi,
            } as Record<string, postgres.ParameterOrJSON<never>>)} returning id`;
          const [b] = (await biaya(tx, {})) as unknown as postgres.Row[];
          await tolak(tx, "biaya_tak_terduga_nominal_check", (sp) => biaya(sp, { nominal: 0 }));
          await tolak(tx, "biaya_tak_terduga_keterangan_check", (sp) =>
            biaya(sp, { keterangan: "  " }),
          );
          await tolak(tx, "biaya_tak_terduga_kolektor_fk", (sp) =>
            biaya(sp, { kolektor_id: kasir?.id }),
          );
          await tolak(tx, "biaya_tak_terduga_dibuat_oleh_fk", (sp) =>
            biaya(sp, { dibuat_oleh: bos2?.id }),
          );
          await tolak(
            tx,
            "biaya_tak_terduga_append_only",
            (sp) => sp`update biaya_tak_terduga set nominal = 1 where id = ${b?.id}`,
          );
          await tolak(
            tx,
            "biaya_tak_terduga_batal_check",
            (sp) =>
              sp`update biaya_tak_terduga set dibatalkan_at = now(), dibatalkan_oleh = ${bos?.id} where id = ${b?.id}`,
          );

          // ---- serah_terima_kas ---------------------------------------------
          const terima = (sp: Tx, isi: Record<string, unknown>) =>
            sp`insert into serah_terima_kas ${sp({
              kantor_id: k?.id,
              hari_kolektor_id: hk?.id,
              tunai_seharusnya: 1_250_000,
              tunai_diterima: 1_200_000,
              diterima_oleh: kasir?.id,
              ...isi,
            } as Record<string, postgres.ParameterOrJSON<never>>)} returning *`;
          // Kas hanya diterima sesudah laporan dibuka, dan hanya hari masuk kerja.
          await tolak(tx, "serah_terima_kas_syarat", (sp) => terima(sp, {}));
          await tolak(tx, "serah_terima_kas_syarat", (sp) =>
            terima(sp, { hari_kolektor_id: hkLibur?.id }),
          );
          await tx`update hari_kolektor set laporan_dibuka_at = now() where id = ${hk?.id}`;
          await tolak(tx, "serah_terima_kas_nominal_check", (sp) =>
            terima(sp, { tunai_diterima: -1 }),
          );
          await tolak(tx, "serah_terima_kas_hari_fk", (sp) =>
            terima(sp, { kantor_id: k2?.id, diterima_oleh: bos2?.id }),
          );
          await tolak(tx, "serah_terima_kas_diterima_oleh_fk", (sp) =>
            terima(sp, { diterima_oleh: bos2?.id }),
          );
          // Contoh aturan-usaha I2: seharusnya 1.250.000, diterima 1.200.000 → tekor 50.000.
          const [st] = (await terima(tx, {})) as unknown as postgres.Row[];
          expect(st?.selisih_setor).toBe("-50000");
          await tolak(tx, "uniq_serah_terima_kas_hari", (sp) => terima(sp, {}));

          // Hari terkunci selama kas diterima (aturan-usaha I4).
          await tolak(
            tx,
            "hari_kolektor_terkunci",
            (sp) => sp`update hari_kolektor set kas_lapangan = 900000 where id = ${hk?.id}`,
          );
          await tolak(
            tx,
            "hari_kolektor_terkunci",
            (sp) => sp`update hari_kolektor set laporan_dibuka_at = null where id = ${hk?.id}`,
          );
          await tolak(tx, "transfer_setoran_terkunci", (sp) =>
            transfer(sp, { transaksi_id: tLain, nominal: 50_000 }),
          );
          await tolak(
            tx,
            "transfer_setoran_terkunci",
            (sp) =>
              sp`update transfer_setoran set dibatalkan_at = now(), dibatalkan_oleh = ${bos?.id},
                 alasan_batal = 'x' where id = ${tf2?.id}`,
          );
          await tolak(tx, "biaya_tak_terduga_terkunci", (sp) => biaya(sp, {}));
          await tolak(
            tx,
            "biaya_tak_terduga_terkunci",
            (sp) =>
              sp`update biaya_tak_terduga set dibatalkan_at = now(), dibatalkan_oleh = ${bos?.id},
                 alasan_batal = 'x' where id = ${b?.id}`,
          );

          await tolak(
            tx,
            "serah_terima_kas_append_only",
            (sp) => sp`update serah_terima_kas set tunai_diterima = 1250000 where id = ${st?.id}`,
          );
          await tolak(
            tx,
            "serah_terima_kas_append_only",
            (sp) => sp`delete from serah_terima_kas where id = ${st?.id}`,
          );
          await tolak(
            tx,
            "serah_terima_kas_batal_check",
            (sp) => sp`update serah_terima_kas set dibatalkan_at = now() where id = ${st?.id}`,
          );

          // Bos membatalkan penerimaan → hari terbuka lagi, kasir menerima ulang.
          await tx`update serah_terima_kas set dibatalkan_at = now(), dibatalkan_oleh = ${bos?.id},
                   alasan_batal = 'transfer terlewat' where id = ${st?.id}`;
          await transfer(tx, { transaksi_id: tLain, nominal: 50_000 });
          await biaya(tx, { nominal: 20_000, keterangan: "tambal ban" });
          await tx`update hari_kolektor set uang_jalan = 60000 where id = ${hk?.id}`;
          const [st2] = (await terima(tx, {
            tunai_seharusnya: 1_130_000,
            tunai_diterima: 1_150_000,
          })) as unknown as postgres.Row[];
          expect(st2?.selisih_setor).toBe("20000");

          // Jalan pintas migrasi: data lama tanpa laporan dibuka boleh disalin.
          await tx.savepoint(async (sp) => {
            await sp`select set_config('nael.migrasi_data', 'ya', true)`;
            await terima(sp as unknown as Tx, { hari_kolektor_id: hkLibur?.id });
            await sp`select set_config('nael.migrasi_data', '', true)`;
          });

          throw new Batalkan();
        })
        .catch((e) => {
          if (!(e instanceof Batalkan)) throw e;
        });
    } finally {
      await sql.end();
    }
  }, 60_000);

  test("posisi_harian menolak data salah", async () => {
    pastikanDatabasePengembangan(url);
    const sql = postgres(url as string, { prepare: false, max: 1, onnotice: () => {} });
    try {
      await sql
        .begin(async (tx) => {
          const [k] = await tx`insert into kantor (nama) values ('Uji A') returning id`;
          const [k2] = await tx`insert into kantor (nama) values ('Uji B') returning id`;
          const [kol] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kolektor', 'Andi') returning id`;
          const [kasir] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kasir', 'Sari') returning id`;
          const potret = (sp: Tx, isi: Record<string, unknown>) =>
            sp`insert into posisi_harian ${sp({
              kantor_id: k?.id,
              kolektor_id: kol?.id,
              tanggal: "2026-10-20",
              jenis: "harian",
              jumlah_berjalan: 10,
              saldo_berjalan: 6_000_000,
              angsuran_berjalan: 500_000,
              ...isi,
            } as Record<string, postgres.ParameterOrJSON<never>>)}`;
          await potret(tx, {});
          await potret(tx, { jenis: "mingguan" });
          await tolak(tx, "posisi_harian_pkey", (sp) => potret(sp, {}));
          await tolak(tx, "posisi_harian_kolektor_fk", (sp) =>
            potret(sp, { tanggal: "2026-10-21", kolektor_id: kasir?.id }),
          );
          await tolak(tx, "posisi_harian_kolektor_fk", (sp) =>
            potret(sp, { tanggal: "2026-10-21", kantor_id: k2?.id }),
          );
          await tolak(tx, "posisi_harian_nominal_check", (sp) =>
            potret(sp, { tanggal: "2026-10-21", saldo_macet: -1 }),
          );

          throw new Batalkan();
        })
        .catch((e) => {
          if (!(e instanceof Batalkan)) throw e;
        });
    } finally {
      await sql.end();
    }
  }, 60_000);

  test("buku_kas, mutasi_kas_kantor, pencocokan_kas, penarikan & koreksi tabungan menolak data salah", async () => {
    pastikanDatabasePengembangan(url);
    const sql = postgres(url as string, { prepare: false, max: 1, onnotice: () => {} });
    try {
      await sql
        .begin(async (tx) => {
          const [k] = await tx`insert into kantor (nama) values ('Uji A') returning id`;
          const [k2] = await tx`insert into kantor (nama) values ('Uji B') returning id`;
          const [bos] = await tx`
            insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
            values (${k?.id}, 'bos', 'Bos A', '+6281234567890', 'hash') returning id`;
          const [bos2] = await tx`
            insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
            values (${k2?.id}, 'bos', 'Bos B', '+6281111111111', 'hash') returning id`;
          const [kol] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kolektor', 'Andi') returning id`;
          const [w] = await tx`
            insert into wilayah (kantor_id, nama, dibuat_oleh) values (${k?.id}, 'Pule', ${kol?.id}) returning id`;
          const [n] = await tx`
            insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id, saldo_tabungan)
            values (${k?.id}, ${kol?.id}, 'Lasminati', ${w?.id}, 600000) returning id`;
          const isi = (x: Record<string, unknown>) =>
            x as Record<string, postgres.ParameterOrJSON<never>>;

          // ---- buku_kas & mutasi_kas_kantor ------------------------------------
          const mutasi = (sp: Tx, x: Record<string, unknown>) =>
            sp`insert into mutasi_kas_kantor ${sp(
              isi({
                kantor_id: k?.id,
                tanggal: "2026-10-24",
                jenis: "setor_modal",
                ke_akun: "tunai",
                nominal: 1_000_000,
                keterangan: "modal tambahan",
                dibuat_oleh: bos?.id,
                ...x,
              }),
            )} returning id`;
          // Belum ada buku kas → mutasi ditolak.
          await tolak(tx, "mutasi_kas_kantor_kantor_fk", (sp) => mutasi(sp, {}));
          const buka = (sp: Tx, x: Record<string, unknown>) =>
            sp`insert into buku_kas ${sp(
              isi({ kantor_id: k?.id, tanggal_buka: "2026-10-24", dibuka_oleh: bos?.id, ...x }),
            )}`;
          await tolak(tx, "buku_kas_nominal_check", (sp) => buka(sp, { kas_awal_tunai: -1 }));
          await tolak(tx, "buku_kas_dibuka_oleh_fk", (sp) => buka(sp, { dibuka_oleh: bos2?.id }));
          await buka(tx, { kas_awal_tunai: 5_000_000, kas_awal_bank: 2_000_000 });
          await tolak(tx, "buku_kas_pkey", (sp) => buka(sp, {}));

          const [m] = (await mutasi(tx, {})) as unknown as postgres.Row[];
          await mutasi(tx, {
            jenis: "pindah_akun",
            dari_akun: "tunai",
            ke_akun: "bank",
            keterangan: "setor ke BRI",
          });
          await mutasi(tx, {
            jenis: "biaya_kantor",
            dari_akun: "bank",
            ke_akun: null,
            keterangan: "listrik",
          });
          // Arah akun per jenis.
          await tolak(tx, "mutasi_kas_kantor_akun_check", (sp) =>
            mutasi(sp, { jenis: "setor_modal", dari_akun: "bank" }),
          );
          await tolak(tx, "mutasi_kas_kantor_akun_check", (sp) =>
            mutasi(sp, { jenis: "tarik_modal", ke_akun: null }),
          );
          await tolak(tx, "mutasi_kas_kantor_akun_check", (sp) =>
            mutasi(sp, { jenis: "pindah_akun", dari_akun: "tunai", ke_akun: "tunai" }),
          );
          await tolak(tx, "mutasi_kas_kantor_akun_check", (sp) =>
            mutasi(sp, { jenis: "pindah_akun", ke_akun: "bank" }),
          );
          await tolak(tx, "mutasi_kas_kantor_nominal_check", (sp) => mutasi(sp, { nominal: 0 }));
          await tolak(tx, "mutasi_kas_kantor_keterangan_check", (sp) =>
            mutasi(sp, { keterangan: " " }),
          );
          await tolak(tx, "mutasi_kas_kantor_dibuat_oleh_fk", (sp) =>
            mutasi(sp, { dibuat_oleh: bos2?.id }),
          );
          await tolak(
            tx,
            "mutasi_kas_kantor_append_only",
            (sp) => sp`update mutasi_kas_kantor set nominal = 5 where id = ${m?.id}`,
          );
          await tolak(
            tx,
            "mutasi_kas_kantor_batal_check",
            (sp) => sp`update mutasi_kas_kantor set dibatalkan_at = now() where id = ${m?.id}`,
          );
          await tx`update mutasi_kas_kantor set dibatalkan_at = now(), dibatalkan_oleh = ${bos?.id},
                   alasan_batal = 'salah ketik' where id = ${m?.id}`;

          // ---- pencocokan_kas --------------------------------------------------
          const cocok = (sp: Tx, x: Record<string, unknown>) =>
            sp`insert into pencocokan_kas ${sp(
              isi({
                kantor_id: k?.id,
                tanggal: "2026-10-24",
                akun: "tunai",
                saldo_buku: 8_450_000,
                saldo_nyata: 8_450_000,
                dicocokkan_oleh: bos?.id,
                ...x,
              }),
            )} returning *`;
          await cocok(tx, {});
          // Contoh dokumen: buku 8.450.000, nyata 8.400.000 → kurang 50.000, keterangan wajib.
          await tolak(tx, "pencocokan_kas_keterangan_check", (sp) =>
            cocok(sp, { saldo_nyata: 8_400_000 }),
          );
          await tolak(tx, "pencocokan_kas_keterangan_check", (sp) =>
            cocok(sp, { saldo_nyata: 8_400_000, keterangan: "  " }),
          );
          const [pc] = (await cocok(tx, {
            saldo_nyata: 8_400_000,
            keterangan: "kembalian belum dicatat",
          })) as unknown as postgres.Row[];
          expect(pc?.selisih).toBe("-50000");
          await tolak(tx, "pencocokan_kas_nominal_check", (sp) =>
            cocok(sp, { saldo_nyata: -1, keterangan: "x" }),
          );
          await tolak(tx, "pencocokan_kas_kantor_fk", (sp) =>
            cocok(sp, { kantor_id: k2?.id, dicocokkan_oleh: bos2?.id }),
          );
          await tolak(
            tx,
            "pencocokan_kas_append_only",
            (sp) => sp`update pencocokan_kas set saldo_nyata = 8450000 where id = ${pc?.id}`,
          );

          // ---- penarikan_tabungan ------------------------------------------------
          const tarik = (sp: Tx, x: Record<string, unknown>) =>
            sp`insert into penarikan_tabungan ${sp(
              isi({
                kantor_id: k?.id,
                nasabah_id: n?.id,
                tanggal: "2026-10-24",
                nominal: 300_000,
                dari_akun: "tunai",
                saldo_sebelum: 600_000,
                alasan_penarikan: "diambil separuh saat gulung",
                dibuat_oleh: bos?.id,
                ...x,
              }),
            )} returning id`;
          const [pt] = (await tarik(tx, {})) as unknown as postgres.Row[];
          await tolak(tx, "penarikan_tabungan_nominal_check", (sp) =>
            tarik(sp, { nominal: 600_001 }),
          );
          await tolak(tx, "penarikan_tabungan_nominal_check", (sp) => tarik(sp, { nominal: 0 }));
          await tolak(tx, "penarikan_tabungan_alasan_check", (sp) =>
            tarik(sp, { alasan_penarikan: "" }),
          );
          await tolak(tx, "penarikan_tabungan_kantor_fk", (sp) =>
            tarik(sp, { kantor_id: k2?.id, dibuat_oleh: bos2?.id }),
          );
          await tolak(
            tx,
            "penarikan_tabungan_append_only",
            (sp) => sp`delete from penarikan_tabungan where id = ${pt?.id}`,
          );
          // Pengaman terakhir: saldo tabungan nasabah tak boleh minus.
          await tolak(
            tx,
            "nasabah_saldo_tabungan_check",
            (sp) =>
              sp`update nasabah set saldo_tabungan = saldo_tabungan - 700000 where id = ${n?.id}`,
          );

          // ---- koreksi_tabungan --------------------------------------------------
          const koreksi = (sp: Tx, x: Record<string, unknown>) =>
            sp`insert into koreksi_tabungan ${sp(
              isi({
                kantor_id: k?.id,
                nasabah_id: n?.id,
                tanggal: "2026-10-24",
                saldo_sebelum: 600_000,
                selisih: -50_000,
                alasan_koreksi: "salah salin dari buku lama",
                dibuat_oleh: bos?.id,
                ...x,
              }),
            )} returning id`;
          const [kr] = (await koreksi(tx, {})) as unknown as postgres.Row[];
          await tolak(tx, "koreksi_tabungan_nominal_check", (sp) => koreksi(sp, { selisih: 0 }));
          await tolak(tx, "koreksi_tabungan_nominal_check", (sp) =>
            koreksi(sp, { selisih: -600_001 }),
          );
          await tolak(tx, "koreksi_tabungan_alasan_check", (sp) =>
            koreksi(sp, { alasan_koreksi: " " }),
          );
          await tolak(tx, "koreksi_tabungan_nasabah_fk", (sp) =>
            koreksi(sp, { kantor_id: k2?.id, dibuat_oleh: bos2?.id }),
          );
          // Tak ada kolom batal: koreksi tak pernah diubah atau dihapus.
          await tolak(
            tx,
            "koreksi_tabungan_append_only",
            (sp) => sp`update koreksi_tabungan set alasan_koreksi = 'x' where id = ${kr?.id}`,
          );
          await tolak(
            tx,
            "koreksi_tabungan_append_only",
            (sp) => sp`delete from koreksi_tabungan where id = ${kr?.id}`,
          );

          throw new Batalkan();
        })
        .catch((e) => {
          if (!(e instanceof Batalkan)) throw e;
        });
    } finally {
      await sql.end();
    }
  }, 60_000);

  test("pembayaran_gaji menolak data salah — periode tak tumpang tindih", async () => {
    pastikanDatabasePengembangan(url);
    const sql = postgres(url as string, { prepare: false, max: 1, onnotice: () => {} });
    try {
      await sql
        .begin(async (tx) => {
          const [k] = await tx`insert into kantor (nama) values ('Uji A') returning id`;
          const [k2] = await tx`insert into kantor (nama) values ('Uji B') returning id`;
          const [bos] = await tx`
            insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
            values (${k?.id}, 'bos', 'Bos A', '+6281234567890', 'hash') returning id`;
          const [bos2] = await tx`
            insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
            values (${k2?.id}, 'bos', 'Bos B', '+6281111111111', 'hash') returning id`;
          const [kol] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kolektor', 'Andi') returning id`;
          const [kol2] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kolektor', 'Dedi') returning id`;
          const [kasir] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kasir', 'Sari') returning id`;
          const gaji = (sp: Tx, x: Record<string, unknown>) =>
            sp`insert into pembayaran_gaji ${sp({
              kantor_id: k?.id,
              kolektor_id: kol?.id,
              periode_mulai: "2026-10-01",
              periode_selesai: "2026-10-15",
              gaji_kotor: 600_000,
              potongan_tekor: 50_000,
              dari_akun: "tunai",
              tanggal_bayar: "2026-10-16",
              dibuat_oleh: bos?.id,
              ...x,
            } as Record<string, postgres.ParameterOrJSON<never>>)} returning *`;
          // Gaji kas keluar: buku kas harus sudah dibuka.
          await tolak(tx, "pembayaran_gaji_kantor_fk", (sp) => gaji(sp, {}));
          await tx`insert into buku_kas (kantor_id, tanggal_buka, dibuka_oleh)
                   values (${k?.id}, '2026-09-01', ${bos?.id})`;

          // Contoh aturan-usaha J4: kotor 600.000 − tekor 50.000 = bersih 550.000.
          const [g] = (await gaji(tx, {})) as unknown as postgres.Row[];
          expect(g?.gaji_bersih).toBe("550000");
          // Tumpang tindih sehari pun ditolak; kolektor lain & periode sesudahnya boleh.
          await tolak(tx, "pembayaran_gaji_periode_excl", (sp) =>
            gaji(sp, {
              periode_mulai: "2026-10-15",
              periode_selesai: "2026-10-20",
              tanggal_bayar: "2026-10-21",
            }),
          );
          await gaji(tx, { kolektor_id: kol2?.id });
          await gaji(tx, {
            periode_mulai: "2026-10-16",
            periode_selesai: "2026-10-31",
            tanggal_bayar: "2026-11-01",
          });
          // Periode harus sudah berakhir sebelum dibayar.
          await tolak(tx, "pembayaran_gaji_periode_check", (sp) =>
            gaji(sp, {
              periode_mulai: "2026-11-01",
              periode_selesai: "2026-11-15",
              tanggal_bayar: "2026-11-15",
            }),
          );
          await tolak(tx, "pembayaran_gaji_periode_check", (sp) =>
            gaji(sp, {
              periode_mulai: "2026-11-15",
              periode_selesai: "2026-11-01",
              tanggal_bayar: "2026-11-20",
            }),
          );
          // Tekor melebihi gaji ditolak.
          await tolak(tx, "pembayaran_gaji_nominal_check", (sp) =>
            gaji(sp, {
              periode_mulai: "2026-11-01",
              periode_selesai: "2026-11-15",
              tanggal_bayar: "2026-11-16",
              potongan_tekor: 600_001,
            }),
          );
          await tolak(tx, "pembayaran_gaji_kolektor_fk", (sp) =>
            gaji(sp, {
              kolektor_id: kasir?.id,
              periode_mulai: "2026-12-01",
              periode_selesai: "2026-12-15",
              tanggal_bayar: "2026-12-16",
            }),
          );
          await tolak(tx, "pembayaran_gaji_dibuat_oleh_fk", (sp) =>
            gaji(sp, {
              dibuat_oleh: bos2?.id,
              periode_mulai: "2026-12-01",
              periode_selesai: "2026-12-15",
              tanggal_bayar: "2026-12-16",
            }),
          );
          await tolak(
            tx,
            "pembayaran_gaji_append_only",
            (sp) => sp`update pembayaran_gaji set gaji_kotor = 1 where id = ${g?.id}`,
          );
          await tolak(
            tx,
            "pembayaran_gaji_batal_check",
            (sp) => sp`update pembayaran_gaji set dibatalkan_at = now() where id = ${g?.id}`,
          );
          // Sesudah batal, periode yang sama boleh dibayar ulang.
          await tx`update pembayaran_gaji set dibatalkan_at = now(), dibatalkan_oleh = ${bos?.id},
                   alasan_batal = 'salah akun' where id = ${g?.id}`;
          await gaji(tx, { dari_akun: "bank" });

          throw new Batalkan();
        })
        .catch((e) => {
          if (!(e instanceof Batalkan)) throw e;
        });
    } finally {
      await sql.end();
    }
  }, 60_000);

  test("batal transaksi & batal akad terkunci sesudah kas diterima", async () => {
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
          const [w] = await tx`
            insert into wilayah (kantor_id, nama, dibuat_oleh) values (${k?.id}, 'Pule', ${kol?.id}) returning id`;
          const pinjamanBaru = async (nama: string) => {
            const [n] = await tx`
              insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
              values (${k?.id}, ${kol?.id}, ${nama}, ${w?.id}) returning id`;
            const [p] = await tx`
              insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
                asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
                total_kembali, angsuran, saldo_awal, drop_baru, saldo)
              values (${k?.id}, ${kol?.id}, ${bos?.id}, ${n?.id}, 1, 'harian', 24, 'migrasi', '2026-10-02',
                '2026-10-02', 1000000, 0, 0, 0, 1200000, 50000, 1200000, 0, 1200000) returning id`;
            return p?.id as string;
          };
          const pAkad = await pinjamanBaru("Budi");
          const pSetor = await pinjamanBaru("Sari");
          const [t] = await tx`
            insert into transaksi (kantor_id, pencatat_id, pinjaman_id, tanggal, jenis, setoran_murni, saldo_sesudah)
            values (${k?.id}, ${kol?.id}, ${pSetor}, '2026-10-02', 'angsuran', 50000, 1150000) returning id`;
          const [hk] = await tx`
            insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi, laporan_dibuka_at)
            values (${k?.id}, ${kol?.id}, '2026-10-02', 'masuk_kerja', now()) returning id`;
          const [st] = await tx`
            insert into serah_terima_kas (kantor_id, hari_kolektor_id, tunai_seharusnya, tunai_diterima, diterima_oleh)
            values (${k?.id}, ${hk?.id}, 50000, 50000, ${bos?.id}) returning id`;

          const batalTransaksi = (sp: Tx) =>
            sp`update transaksi set dibatalkan_at = now(), dibatalkan_oleh = ${bos?.id},
               alasan_batal = 'salah' where id = ${t?.id}`;
          const batalAkad = (sp: Tx) =>
            sp`update pinjaman set status = 'batal', tanggal_selesai = '2026-10-02', dibatalkan_at = now(),
               dibatalkan_oleh = ${bos?.id}, alasan_batal = 'salah' where id = ${pAkad}`;
          await tolak(tx, "transaksi_terkunci", batalTransaksi);
          await tolak(tx, "pinjaman_terkunci", batalAkad);
          // Perubahan status lain (sapuan macet) tidak terkunci.
          await tx`update pinjaman set status = 'macet', tanggal_macet = '2026-10-02' where id = ${pSetor}`;

          // Bos membatalkan penerimaan → pembatalan boleh.
          await tx`update serah_terima_kas set dibatalkan_at = now(), dibatalkan_oleh = ${bos?.id},
                   alasan_batal = 'buka lagi' where id = ${st?.id}`;
          await batalTransaksi(tx);
          await batalAkad(tx);

          throw new Batalkan();
        })
        .catch((e) => {
          if (!(e instanceof Batalkan)) throw e;
        });
    } finally {
      await sql.end();
    }
  }, 60_000);

  test("rute_kolektor & rute_wilayah menolak data salah", async () => {
    pastikanDatabasePengembangan(url);
    const sql = postgres(url as string, { prepare: false, max: 1, onnotice: () => {} });
    try {
      await sql
        .begin(async (tx) => {
          const [k] = await tx`insert into kantor (nama) values ('Uji A') returning id`;
          const [k2] = await tx`insert into kantor (nama) values ('Uji B') returning id`;
          const [bos2] = await tx`
            insert into pengguna (kantor_id, peran, nama, nomor_hp, hash_sandi)
            values (${k2?.id}, 'bos', 'Bos B', '+6281111111111', 'hash') returning id`;
          const [kol] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kolektor', 'Andi') returning id`;
          const [kasir] = await tx`
            insert into pengguna (kantor_id, peran, nama) values (${k?.id}, 'kasir', 'Sari') returning id`;
          const kampung = async (kantorId: string, nama: string, oleh: string) =>
            (
              await tx`insert into wilayah (kantor_id, nama, dibuat_oleh)
                       values (${kantorId}, ${nama}, ${oleh}) returning id`
            )[0]?.id as string;
          const w1 = await kampung(k?.id, "Pule", kol?.id);
          const w2 = await kampung(k?.id, "Sawah", kol?.id);
          const wLain = await kampung(k2?.id, "Kota", bos2?.id);

          await tolak(
            tx,
            "rute_kolektor_kolektor_fk",
            (sp) =>
              sp`insert into rute_kolektor (kolektor_id, kantor_id) values (${kasir?.id}, ${k?.id})`,
          );
          await tx`insert into rute_kolektor (kolektor_id, kantor_id, diubah_oleh)
                   values (${kol?.id}, ${k?.id}, ${kol?.id})`;
          await tolak(
            tx,
            "rute_kolektor_versi_check",
            (sp) => sp`update rute_kolektor set versi = 0 where kolektor_id = ${kol?.id}`,
          );
          await tolak(
            tx,
            "rute_kolektor_diubah_oleh_fk",
            (sp) =>
              sp`update rute_kolektor set diubah_oleh = ${bos2?.id} where kolektor_id = ${kol?.id}`,
          );

          const urut = (sp: Tx, wilayahId: string, urutan: number) =>
            sp`insert into rute_wilayah (kolektor_id, kantor_id, wilayah_id, urutan)
               values (${kol?.id}, ${k?.id}, ${wilayahId}, ${urutan})`;
          await urut(tx, w1, 1);
          await tolak(tx, "rute_wilayah_pkey", (sp) => urut(sp, w1, 2));
          await tolak(tx, "uniq_rute_wilayah_urutan", (sp) => urut(sp, w2, 1));
          await tolak(tx, "rute_wilayah_urutan_check", (sp) => urut(sp, w2, 0));
          await tolak(tx, "rute_wilayah_wilayah_fk", (sp) => urut(sp, wLain, 2));
          await urut(tx, w2, 2);
          // Kampung yang masih di rute tak bisa dihapus.
          await tolak(
            tx,
            "rute_wilayah_wilayah_fk",
            (sp) => sp`delete from wilayah where id = ${w1}`,
          );
          // Kepala rute dihapus → barisnya ikut (cascade).
          await tx`delete from rute_kolektor where kolektor_id = ${kol?.id}`;
          const [sisa] =
            await tx`select count(*)::int as n from rute_wilayah where kolektor_id = ${kol?.id}`;
          expect(sisa?.n).toBe(0);

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
