import { describe, expect, test } from "bun:test";
import postgres from "postgres";
import { Batalkan, type Tx, tolak, URL_DB as url } from "../../../uji/skema";
import { pastikanDatabasePengembangan } from "../penjaga";

/** Uji skema (wilayah, foto, nasabah) — lihat uji/skema.ts untuk aturan umumnya. */
describe.skipIf(!url)("skema database", () => {
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
});
