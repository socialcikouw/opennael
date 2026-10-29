import { describe, test } from "bun:test";
import postgres from "postgres";
import { Batalkan, type Tx, tolak, URL_DB as url } from "../../../uji/skema";
import { pastikanDatabasePengembangan } from "../penjaga";

/** Uji skema (batal transaksi & batal akad terkunci sesudah kas diterima) — lihat uji/skema.ts untuk aturan umumnya. */
describe.skipIf(!url)("skema database", () => {
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
});
