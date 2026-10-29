import { describe, expect, test } from "bun:test";
import postgres from "postgres";
import { Batalkan, type Tx, tolak, URL_DB as url } from "../../../uji/skema";
import { pastikanDatabasePengembangan } from "../penjaga";

/** Uji skema (rute_kolektor & rute_wilayah) — lihat uji/skema.ts untuk aturan umumnya. */
describe.skipIf(!url)("skema database", () => {
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
