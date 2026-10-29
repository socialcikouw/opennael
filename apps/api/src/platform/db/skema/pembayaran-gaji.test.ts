import { describe, expect, test } from "bun:test";
import postgres from "postgres";
import { Batalkan, type Tx, tolak, URL_DB as url } from "../../../uji/skema";
import { pastikanDatabasePengembangan } from "../penjaga";

/** Uji skema (pembayaran_gaji) — lihat uji/skema.ts untuk aturan umumnya. */
describe.skipIf(!url)("skema database", () => {
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
});
