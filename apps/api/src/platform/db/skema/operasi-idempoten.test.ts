import { describe, test } from "bun:test";
import postgres from "postgres";
import { Batalkan, type Tx, tolak, URL_DB as url } from "../../../uji/skema";
import { pastikanDatabasePengembangan } from "../penjaga";

/** Uji skema (operasi idempoten) — lihat uji/skema.ts untuk aturan umumnya. */
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
