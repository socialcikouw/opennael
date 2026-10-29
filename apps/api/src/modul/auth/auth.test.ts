import { describe, expect, test } from "bun:test";
import type { Sesi } from "@opennael/contracts";
import { TransactionRollbackError } from "drizzle-orm";
import { buatApp } from "../../app";
import { buatDb, type Db } from "../../platform/db/klien";
import { pastikanDatabasePengembangan } from "../../platform/db/penjaga";

/**
 * Auth ujung ke ujung: HTTP (`app.request`) → layanan → database sungguhan,
 * seluruhnya di SATU transaksi yang dibatalkan di akhir — database
 * pengembangan tidak berubah. Butuh `DATABASE_URL` Supabase dev.
 */
const url = process.env.DATABASE_URL;
const KODE = "kode-registrasi-uji-cukup-panjang";
const RAHASIA = { jwtRahasia: "j".repeat(40), sesiRahasia: "s".repeat(40) };

type Kirim = (jalur: string, isi?: unknown, token?: string) => Promise<Response>;

function pengirim(app: ReturnType<typeof buatApp>): Kirim {
  return async (jalur, isi, token) =>
    app.request(jalur, {
      method: isi === undefined && jalur === "/auth/me" ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(isi === undefined ? {} : { body: JSON.stringify(isi) }),
    });
}

async function dalamTransaksi(uji: (tx: Db) => Promise<void>) {
  pastikanDatabasePengembangan(url);
  const { db, sql } = buatDb(url as string);
  try {
    await db.transaction(async (tx) => {
      await uji(tx);
      tx.rollback();
    });
  } catch (e) {
    if (!(e instanceof TransactionRollbackError)) throw e;
  } finally {
    await sql.end();
  }
}

const daftar = {
  kodeRegistrasi: KODE,
  namaKantor: "Nael Capital Uji",
  nama: "Bos Uji",
  nomorHp: "0812-9999-0001",
  sandi: "sandi-rahasia-uji",
  perangkat: { nama: "HP Uji", platform: "android" },
};

describe.skipIf(!url)("auth", () => {
  test("registrasi, login, me, refresh, keluar", async () => {
    await dalamTransaksi(async (tx) => {
      const kirim = pengirim(buatApp({ db: tx, ...RAHASIA, kodeRegistrasi: KODE }));

      // ---- registrasi -------------------------------------------------------
      const tertutup = pengirim(buatApp({ db: tx, ...RAHASIA }));
      expect((await tertutup("/auth/register", daftar)).status).toBe(403);
      const kodeSalah = await kirim("/auth/register", { ...daftar, kodeRegistrasi: "tebakan" });
      expect(kodeSalah.status).toBe(403);
      expect(((await kodeSalah.json()) as { kode: string }).kode).toBe("REGISTRASI_DITUTUP");

      const tidakSah = await kirim("/auth/register", { ...daftar, nomorHp: "123" });
      expect(tidakSah.status).toBe(400);
      const galatValidasi = (await tidakSah.json()) as {
        kode: string;
        rincian: { jalur: string }[];
      };
      expect(galatValidasi.kode).toBe("VALIDASI");
      expect(galatValidasi.rincian.map((r) => r.jalur)).toContain("nomorHp");

      // Kode yang tersalin bersama spasi tetap diterima.
      const res = await kirim("/auth/register", { ...daftar, kodeRegistrasi: ` ${KODE}\n` });
      expect(res.status).toBe(201);
      const sesi = (await res.json()) as Sesi;
      expect(sesi.pengguna.peran).toBe("bos");
      expect(sesi.pengguna.nomorHp).toBe("+6281299990001");
      expect(sesi.pengguna.kantor.nama).toBe("Nael Capital Uji");
      expect(sesi.tokenSegar).toStartWith("pr1.");

      // Kantor lahir lengkap: pekan kerja & tarif pertama, satu perangkat.
      const [isi] = (await tx.execute(
        `select
           (select hari_kerja from pekan_kerja where kantor_id = '${sesi.pengguna.kantor.id}') as hari_kerja,
           (select tarif_bp from tarif_gaji where kantor_id = '${sesi.pengguna.kantor.id}' and kolektor_id is null) as tarif_bp,
           (select count(*)::int from perangkat where pengguna_id = '${sesi.pengguna.id}') as perangkat`,
      )) as unknown as { hari_kerja: number; tarif_bp: number; perangkat: number }[];
      expect(isi).toEqual({ hari_kerja: 126, tarif_bp: 500, perangkat: 1 });

      const ganda = await kirim("/auth/register", { ...daftar, namaKantor: "Kantor Lain" });
      expect(ganda.status).toBe(409);
      expect(((await ganda.json()) as { kode: string }).kode).toBe("NOMOR_HP_DIPAKAI");

      // ---- login ------------------------------------------------------------
      const sandiSalah = await kirim("/auth/login", {
        nomorHp: daftar.nomorHp,
        sandi: "salah-sandi",
      });
      const nomorAsing = await kirim("/auth/login", {
        nomorHp: "081200000000",
        sandi: daftar.sandi,
      });
      expect(sandiSalah.status).toBe(401);
      expect(nomorAsing.status).toBe(401);
      expect(await sandiSalah.json()).toEqual(await nomorAsing.json());

      const masuk = await kirim("/auth/login", { nomorHp: "+6281299990001", sandi: daftar.sandi });
      expect(masuk.status).toBe(200);
      const sesi2 = (await masuk.json()) as Sesi;

      // ---- me ---------------------------------------------------------------
      expect((await kirim("/auth/me")).status).toBe(401);
      expect((await kirim("/auth/me", undefined, "token-palsu")).status).toBe(401);
      const me = await kirim("/auth/me", undefined, sesi2.tokenAkses);
      expect(me.status).toBe(200);
      expect(((await me.json()) as { id: string }).id).toBe(sesi.pengguna.id);

      // ---- refresh: rotasi, putaran sebelumnya, pakai ulang -----------------
      const segarkan = async (tokenSegar: string) => {
        const r = await kirim("/auth/refresh", { tokenSegar });
        return { status: r.status, isi: (await r.json()) as { tokenSegar: string } };
      };
      const p1 = sesi2.tokenSegar;
      const r2 = await segarkan(p1);
      expect(r2.status).toBe(200);
      expect(r2.isi.tokenSegar).not.toBe(p1);
      // Jawaban hilang di jalan → token putaran sebelumnya dijawab token sekarang.
      const ulang = await segarkan(p1);
      expect(ulang.isi.tokenSegar).toBe(r2.isi.tokenSegar);
      const r3 = await segarkan(r2.isi.tokenSegar);
      expect(r3.status).toBe(200);
      // Putaran 1 kini terlalu tua → tanda dicuri: perangkat diputus.
      expect((await segarkan(p1)).status).toBe(401);
      expect((await segarkan(r3.isi.tokenSegar)).status).toBe(401);
      expect((await segarkan("pr1.palsu")).status).toBe(401);

      // ---- keluar -----------------------------------------------------------
      expect((await kirim("/auth/keluar", undefined, sesi.tokenAkses)).status).toBe(204);
      expect((await segarkan(sesi.tokenSegar)).status).toBe(401);

      const [putus] = (await tx.execute(
        `select string_agg(alasan_putus::text, ',' order by alasan_putus::text) as alasan
         from perangkat where pengguna_id = '${sesi.pengguna.id}'`,
      )) as unknown as { alasan: string }[];
      expect(putus?.alasan).toBe("keluar,pakai_ulang");
    });
  }, 60_000);

  test("sesi lewat umur diputus `kedaluwarsa`", async () => {
    await dalamTransaksi(async (tx) => {
      const kirim = pengirim(buatApp({ db: tx, ...RAHASIA, kodeRegistrasi: KODE }));
      const sesi = (await (await kirim("/auth/register", daftar)).json()) as Sesi;

      const sembilanPuluhSatuHari = 91 * 24 * 60 * 60 * 1000;
      const nanti = pengirim(
        buatApp({
          db: tx,
          ...RAHASIA,
          sekarang: () => new Date(Date.now() + sembilanPuluhSatuHari),
        }),
      );
      expect((await nanti("/auth/refresh", { tokenSegar: sesi.tokenSegar })).status).toBe(401);

      const [p] = (await tx.execute(
        `select alasan_putus::text as alasan from perangkat where pengguna_id = '${sesi.pengguna.id}'`,
      )) as unknown as { alasan: string }[];
      expect(p?.alasan).toBe("kedaluwarsa");
    });
  }, 60_000);
});

describe("pembatas percobaan", () => {
  const batas = { jendelaMs: 60_000, perIp: 3, gagalPerNomor: 2 };

  test("per IP: permintaan ke-4 dalam jendela ditolak 429; IP lain tidak terpengaruh", async () => {
    // Refresh dengan token palsu dijawab tanpa menyentuh database.
    const app = buatApp({ db: {} as Db, ...RAHASIA, batas, percayaProxy: true });
    const coba = (ip: string) =>
      app.request("/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Real-IP": ip },
        body: JSON.stringify({ tokenSegar: "palsu" }),
      });
    for (let i = 0; i < 3; i++) expect((await coba("10.0.0.1")).status).toBe(401);
    const ditolak = await coba("10.0.0.1");
    expect(ditolak.status).toBe(429);
    expect(((await ditolak.json()) as { kode: string }).kode).toBe("TERLALU_BANYAK_PERCOBAAN");
    expect((await coba("10.0.0.2")).status).toBe(401);
  });

  test.skipIf(!url)(
    "per nomor HP: hanya login gagal yang dihitung",
    async () => {
      await dalamTransaksi(async (tx) => {
        const app = buatApp({
          db: tx,
          ...RAHASIA,
          kodeRegistrasi: KODE,
          batas: { ...batas, perIp: 100 },
        });
        const kirim = pengirim(app);
        expect((await kirim("/auth/register", daftar)).status).toBe(201);

        // Berhasil masuk berkali-kali tidak menghabiskan jatah.
        for (let i = 0; i < 3; i++) {
          expect(
            (await kirim("/auth/login", { nomorHp: daftar.nomorHp, sandi: daftar.sandi })).status,
          ).toBe(200);
        }
        // Dua kali salah, lalu ketiga kalinya ditolak — walau sandinya kini benar.
        for (let i = 0; i < 2; i++) {
          expect(
            (await kirim("/auth/login", { nomorHp: daftar.nomorHp, sandi: "salah-sandi" })).status,
          ).toBe(401);
        }
        // Bentuk nomor lain untuk akun yang sama tetap terhitung (dibakukan).
        expect(
          (await kirim("/auth/login", { nomorHp: "+6281299990001", sandi: daftar.sandi })).status,
        ).toBe(429);
        // Nomor lain tidak terpengaruh.
        expect((await kirim("/auth/login", { nomorHp: "081200000000", sandi: "x" })).status).toBe(
          401,
        );
      });
    },
    60_000,
  );
});
