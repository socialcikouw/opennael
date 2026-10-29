import { describe, test } from "bun:test";
import postgres from "postgres";
import { Batalkan, type Tx, tolak, URL_DB as url } from "../../../uji/skema";
import { pastikanDatabasePengembangan } from "../penjaga";

/** Uji skema (posisi_harian) — lihat uji/skema.ts untuk aturan umumnya. */
describe.skipIf(!url)("skema database", () => {
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
});
