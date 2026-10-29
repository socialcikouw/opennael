import { describe, expect, test } from "bun:test";
import postgres from "postgres";
import { Batalkan, type Tx, tolak, URL_DB as url } from "../../../uji/skema";
import { pastikanDatabasePengembangan } from "../penjaga";

/** Uji skema (pinjaman, transaksi, riwayat_status_pinjaman) — lihat uji/skema.ts untuk aturan umumnya. */
describe.skipIf(!url)("skema database", () => {
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
});
