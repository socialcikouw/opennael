import { describe, expect, test } from "bun:test";
import type { Sesi } from "@opennael/contracts";
import { TransactionRollbackError } from "drizzle-orm";
import { buatApp } from "../../../app";
import { buatDb, type Db } from "../../../platform/db/klien";
import { pastikanDatabasePengembangan } from "../../../platform/db/penjaga";

/**
 * Penautan HP lewat QR, ujung ke ujung, di SATU transaksi yang dibatalkan.
 * Butuh `DATABASE_URL` Supabase dev.
 */
const url = process.env.DATABASE_URL;
const KODE_REG = "kode-registrasi-uji-cukup-panjang";
const RAHASIA = { jwtRahasia: "j".repeat(40), sesiRahasia: "s".repeat(40) };

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

function klien(app: ReturnType<typeof buatApp>) {
  return async (jalur: string, isi?: unknown, token?: string) => {
    const res = await app.request(jalur, {
      method: isi === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(isi === undefined ? {} : { body: JSON.stringify(isi) }),
    });
    const teks = await res.text();
    // biome-ignore lint/suspicious/noExplicitAny: isi jawaban di uji dibaca bebas lalu diperiksa expect
    return { status: res.status, isi: (teks ? JSON.parse(teks) : null) as Record<string, any> };
  };
}

describe.skipIf(!url)("tautan QR", () => {
  test("minta → setujui (akun baru / akun lama) → klaim sekali", async () => {
    await dalamTransaksi(async (tx) => {
      const kirim = klien(buatApp({ db: tx, ...RAHASIA, kodeRegistrasi: KODE_REG }));
      const bos = (
        await kirim("/auth/register", {
          kodeRegistrasi: KODE_REG,
          namaKantor: "Kantor Tautan",
          nama: "Bos",
          nomorHp: "081299990002",
          sandi: "sandi-rahasia-uji",
        })
      ).isi as Sesi;

      // ---- 1. HP kolektor meminta kode ------------------------------------
      const t1 = await kirim("/auth/tautan", {
        perangkat: { nama: "HP Andi", platform: "android" },
      });
      expect(t1.status).toBe(201);
      expect(t1.isi.kode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(t1.isi.qr).toBe(`opennael://tautan/${t1.isi.kode.replace("-", "")}`);
      const klaim1 = (k = t1.isi.klaim) => kirim(`/auth/tautan/${t1.isi.id}/klaim`, { klaim: k });

      expect((await klaim1()).isi.status).toBe("menunggu");
      expect((await klaim1("kunci-salah")).status).toBe(404);

      // ---- 2. bos menyetujui: akun kolektor baru ---------------------------
      const akunBaru = { peran: "kolektor", nama: "Andi", resort: "Resort 1" };
      expect(
        (await kirim("/auth/tautan/setujui", { kode: t1.isi.kode, akun: akunBaru })).status,
      ).toBe(401);
      expect(
        (
          await kirim(
            "/auth/tautan/setujui",
            { kode: t1.isi.kode, akun: { peran: "kasir", nama: "x", resort: "R" } },
            bos.tokenAkses,
          )
        ).status,
      ).toBe(400);
      // Kode boleh diketik huruf kecil dengan tanda hubung.
      const setuju = await kirim(
        "/auth/tautan/setujui",
        { kode: t1.isi.kode.toLowerCase(), akun: akunBaru },
        bos.tokenAkses,
      );
      expect(setuju.status).toBe(200);
      expect(setuju.isi.pengguna).toMatchObject({ nama: "Andi", peran: "kolektor" });
      expect(setuju.isi.perangkat).toEqual({ nama: "HP Andi", platform: "android" });
      // Kode yang sudah disetujui tak bisa disetujui lagi.
      expect(
        (await kirim("/auth/tautan/setujui", { kode: t1.isi.kode, akun: akunBaru }, bos.tokenAkses))
          .status,
      ).toBe(404);

      // ---- 3. HP yang sama mengklaim, sekali -------------------------------
      const tertaut = await klaim1();
      expect(tertaut.status).toBe(200);
      expect(tertaut.isi.status).toBe("tertaut");
      const andi = tertaut.isi as Sesi;
      expect(andi.pengguna.peran).toBe("kolektor");
      expect((await kirim("/auth/me", undefined, andi.tokenAkses)).isi.nama).toBe("Andi");
      expect((await klaim1()).status).toBe(409);

      // Kolektor tak bisa menyetujui tautan.
      const t2 = await kirim("/auth/tautan", {});
      const olehKolektor = await kirim(
        "/auth/tautan/setujui",
        { kode: t2.isi.kode, akun: { penggunaId: andi.pengguna.id } },
        andi.tokenAkses,
      );
      expect(olehKolektor.status).toBe(403);
      expect(olehKolektor.isi.kode).toBe("PERAN_DILARANG");

      // Akun bos tak bisa ditautkan.
      const keBos = await kirim(
        "/auth/tautan/setujui",
        { kode: t2.isi.kode, akun: { penggunaId: bos.pengguna.id } },
        bos.tokenAkses,
      );
      expect(keBos.status).toBe(403);
      expect(keBos.isi.kode).toBe("BOS_TIDAK_DITAUTKAN");

      // ---- 4. HP baru untuk akun lama: HP lama diputus `tautan_baru` -------
      expect(
        (
          await kirim(
            "/auth/tautan/setujui",
            { kode: t2.isi.kode, akun: { penggunaId: andi.pengguna.id } },
            bos.tokenAkses,
          )
        ).status,
      ).toBe(200);
      const hpBaru = await kirim(`/auth/tautan/${t2.isi.id}/klaim`, { klaim: t2.isi.klaim });
      expect(hpBaru.isi.status).toBe("tertaut");
      expect((await kirim("/auth/refresh", { tokenSegar: andi.tokenSegar })).status).toBe(401);
      expect((await kirim("/auth/refresh", { tokenSegar: hpBaru.isi.tokenSegar })).status).toBe(
        200,
      );

      // ---- jejak -----------------------------------------------------------
      const jejak = (await tx.execute(
        `select aksi from riwayat_perubahan where kantor_id = '${bos.pengguna.kantor.id}' order by aksi`,
      )) as unknown as { aksi: string }[];
      expect(jejak.map((j) => j.aksi)).toEqual([
        "buat_pengguna",
        "setujui_tautan",
        "setujui_tautan",
      ]);
      const [putus] = (await tx.execute(
        `select alasan_putus::text as alasan, diputus_oleh from perangkat
         where pengguna_id = '${andi.pengguna.id}' and diputus_at is not null`,
      )) as unknown as { alasan: string; diputus_oleh: string }[];
      expect(putus).toEqual({ alasan: "tautan_baru", diputus_oleh: bos.pengguna.id });
    });
  }, 60_000);

  test("kode yang tak disetujui kedaluwarsa sesudah 2 menit", async () => {
    await dalamTransaksi(async (tx) => {
      const t = await klien(buatApp({ db: tx, ...RAHASIA }))("/auth/tautan", {});
      const tigaMenit = 3 * 60_000;
      const nanti = klien(
        buatApp({ db: tx, ...RAHASIA, sekarang: () => new Date(Date.now() + tigaMenit) }),
      );
      const hasil = await nanti(`/auth/tautan/${t.isi.id}/klaim`, { klaim: t.isi.klaim });
      expect(hasil.isi.status).toBe("kedaluwarsa");
    });
  }, 60_000);
});
