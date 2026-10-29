import { describe, expect, test } from "bun:test";
import postgres from "postgres";
import { Batalkan, type Tx, tolak, URL_DB as url } from "../../../uji/skema";
import { pastikanDatabasePengembangan } from "../penjaga";

/** Uji skema (buku_kas, mutasi_kas_kantor, pencocokan_kas, penarikan & koreksi tabungan) — lihat uji/skema.ts untuk aturan umumnya. */
describe.skipIf(!url)("skema database", () => {
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
});
