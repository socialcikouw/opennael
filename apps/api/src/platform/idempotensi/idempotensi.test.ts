import { describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../uji/bantu";
import { buatDb } from "../db/klien";
import { pastikanDatabasePengembangan } from "../db/penjaga";
import { kantor, operasiIdempoten, pengguna } from "../db/skema";
import type { Aktor } from "../http/aktor";
import { jalankanIdempoten } from "./index";

describe.skipIf(!URL_DB)("idempotensi", () => {
  test("HTTP: replay hasil, beda isi ditolak, kegagalan tidak diklaim, klien lama tetap diterima", async () => {
    await dalamTransaksi(async (db) => {
      const { app, bos } = await siapkanKantor(db);
      const kunci = crypto.randomUUID();
      const kirim = (isi: unknown, key: string | undefined = kunci) =>
        app.request("/kas/buka", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bos.tokenAkses}`,
            "Content-Type": "application/json",
            ...(key ? { "Idempotency-Key": key } : {}),
          },
          body: JSON.stringify(isi),
        });
      const pertama = await kirim({ tunai: 1000000, bank: 0 });
      expect(pertama.status).toBe(200);
      const hasil = await pertama.json();
      const ulang = await kirim({ bank: 0, tunai: 1000000 });
      expect(ulang.status).toBe(200);
      expect(await ulang.json()).toEqual(hasil);
      expect((await kirim({ tunai: 2000000, bank: 0 })).status).toBe(409);
      expect((await kirim({ tunai: 1000000, bank: 0 }, "bukan-uuid")).status).toBe(400);
      const gagal = crypto.randomUUID();
      expect((await kirim({ tunai: 1000000, bank: 0 }, gagal)).status).toBe(409);
      expect(
        await db.select().from(operasiIdempoten).where(eq(operasiIdempoten.kunci, gagal)),
      ).toHaveLength(0);
      expect(
        await db.select().from(operasiIdempoten).where(eq(operasiIdempoten.kunci, kunci)),
      ).toHaveLength(1);
    });
  }, 30000);

  test("dua koneksi: satu efek, replay sesudah commit, rollback utuh dan isolasi pelaku", async () => {
    pastikanDatabasePengembangan(URL_DB);
    const a = buatDb(URL_DB as string);
    const b = buatDb(URL_DB as string);
    const kantorId = crypto.randomUUID();
    const penggunaId = crypto.randomUUID();
    const aktor: Aktor = {
      kantorId,
      penggunaId,
      peran: "kolektor",
      perangkatId: crypto.randomUUID(),
    };
    const kunci = crypto.randomUUID();
    let mulai!: () => void;
    let lanjut!: () => void;
    const sudahMulai = new Promise<void>((resolve) => {
      mulai = resolve;
    });
    const bolehLanjut = new Promise<void>((resolve) => {
      lanjut = resolve;
    });
    let efek = 0;
    try {
      await a.db.insert(kantor).values({ id: kantorId, nama: "Uji idempotensi" });
      await a.db
        .insert(pengguna)
        .values({ id: penggunaId, kantorId, peran: "kolektor", nama: "Uji" });
      const pertama = jalankanIdempoten(
        a.db,
        aktor,
        kunci,
        "uji/tulis",
        { uang: 50000 },
        async (tx) => {
          efek++;
          await tx.update(kantor).set({ nama: "Satu efek" }).where(eq(kantor.id, kantorId));
          mulai();
          await bolehLanjut;
          return { id: crypto.randomUUID(), uang: 50000 };
        },
      );
      await sudahMulai;
      const kedua = jalankanIdempoten(
        b.db,
        aktor,
        kunci,
        "uji/tulis",
        { uang: 50000 },
        async () => {
          efek++;
          return { id: crypto.randomUUID(), uang: 0 };
        },
      );
      lanjut();
      const hasil = await Promise.all([pertama, kedua]);
      expect(hasil[0]).toEqual(hasil[1]);
      expect(efek).toBe(1);
      const bentrok = await jalankanIdempoten(
        b.db,
        aktor,
        kunci,
        "uji/lain",
        {},
        async () => ({}),
      ).catch((e: unknown) => e);
      expect(bentrok).toMatchObject({ kode: "KUNCI_IDEMPOTEN_BERBEDA" });
      const gagal = crypto.randomUUID();
      const galat = await jalankanIdempoten(a.db, aktor, gagal, "uji/gagal", {}, async (tx) => {
        await tx.update(kantor).set({ nama: "Harus rollback" }).where(eq(kantor.id, kantorId));
        throw new Error("uji rollback");
      }).catch((e: unknown) => e);
      expect(galat).toMatchObject({ message: "uji rollback" });
      expect((await b.db.select().from(kantor).where(eq(kantor.id, kantorId)))[0]?.nama).toBe(
        "Satu efek",
      );
      expect(
        await b.db.select().from(operasiIdempoten).where(eq(operasiIdempoten.kunci, gagal)),
      ).toHaveLength(0);
      // Pelaku lain dengan kunci sama harus menjalankan operasinya sendiri.
      const lain = crypto.randomUUID();
      await a.db.insert(pengguna).values({ id: lain, kantorId, peran: "kolektor", nama: "Lain" });
      expect(
        await jalankanIdempoten(
          b.db,
          { ...aktor, penggunaId: lain },
          kunci,
          "uji/tulis",
          {},
          async () => ({ lain: true }),
        ),
      ).toEqual({ lain: true });
    } finally {
      lanjut?.();
      // Hanya fixture UUID milik pengujian ini; tidak menyentuh kantor lain.
      await a.db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('nael.hapus_data_uji', 'ya', true)`);
        await tx.delete(operasiIdempoten).where(eq(operasiIdempoten.kantorId, kantorId));
        await tx.delete(pengguna).where(eq(pengguna.kantorId, kantorId));
        await tx.delete(kantor).where(eq(kantor.id, kantorId));
      });
      await Promise.all([a.sql.end(), b.sql.end()]);
    }
  }, 30000);
});
