import { describe, expect, test } from "bun:test";
import postgres from "postgres";
import { Batalkan, type Tx, tolak, URL_DB as url } from "../../../uji/skema";
import { pastikanDatabasePengembangan } from "../penjaga";

/** Uji skema (serah_terima_kas, transfer_setoran, biaya_tak_terduga) — lihat uji/skema.ts untuk aturan umumnya. */
describe.skipIf(!url)("skema database", () => {
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
});
