import type { Sesi } from "@opennael/contracts";
import { sql, TransactionRollbackError } from "drizzle-orm";
import { type AppDeps, buatApp } from "../app";
import { buatDb, type Db } from "../db/klien";
import { pastikanDatabasePengembangan } from "../db/penjaga";

/**
 * PEMBANTU UJI yang menyentuh database: semuanya berjalan di SATU transaksi
 * yang dibatalkan di akhir — database pengembangan tidak berubah.
 */
export const URL_DB = process.env.DATABASE_URL;
export const KODE_REG = "kode-registrasi-uji-cukup-panjang";
export const RAHASIA = { jwtRahasia: "j".repeat(40), sesiRahasia: "s".repeat(40) };

export async function dalamTransaksi(uji: (tx: Db) => Promise<void>) {
  pastikanDatabasePengembangan(URL_DB);
  const { db, sql: klien } = buatDb(URL_DB as string);
  try {
    await db.transaction(async (tx) => {
      await uji(tx);
      tx.rollback();
    });
  } catch (e) {
    if (!(e instanceof TransactionRollbackError)) throw e;
  } finally {
    await klien.end();
  }
}

export type Jawaban = {
  status: number;
  // biome-ignore lint/suspicious/noExplicitAny: isi jawaban di uji dibaca bebas lalu diperiksa expect
  isi: Record<string, any>;
  kepala: Headers;
};

/** Pengirim permintaan JSON (atau FormData) ke aplikasi uji. */
export function pengirim(app: ReturnType<typeof buatApp>) {
  return async (
    jalur: string,
    opsi: { metode?: string; isi?: unknown; token?: string | undefined } = {},
  ): Promise<Jawaban> => {
    const form = opsi.isi instanceof FormData;
    const res = await app.request(jalur, {
      method: opsi.metode ?? (opsi.isi === undefined ? "GET" : "POST"),
      headers: {
        ...(form ? {} : { "Content-Type": "application/json" }),
        ...(opsi.token ? { Authorization: `Bearer ${opsi.token}` } : {}),
      },
      ...(opsi.isi === undefined
        ? {}
        : { body: form ? (opsi.isi as FormData) : JSON.stringify(opsi.isi) }),
    });
    const jenis = res.headers.get("Content-Type") ?? "";
    const isi = jenis.includes("json")
      ? ((await res.json()) as Jawaban["isi"])
      : { berkas: new Uint8Array(await res.arrayBuffer()) };
    return { status: res.status, isi, kepala: res.headers };
  };
}

/**
 * Kantor siap uji: bos terdaftar, HP kolektor tertaut, jam buka 00:00 dan
 * kerja tiap hari (uji berjalan jam berapa pun).
 */
export async function siapkanKantor(tx: Db, deps: Partial<AppDeps> = {}) {
  const app = buatApp({ db: tx, ...RAHASIA, kodeRegistrasi: KODE_REG, ...deps });
  const kirim = pengirim(app);
  const bos = (
    await kirim("/auth/register", {
      isi: {
        kodeRegistrasi: KODE_REG,
        namaKantor: "Kantor Uji",
        nama: "Bos",
        nomorHp: "081299990099",
        sandi: "sandi-rahasia-uji",
      },
    })
  ).isi as Sesi;
  const kantorId = bos.pengguna.kantor.id;
  await tx.execute(sql`update kantor set jam_buka = '00:00' where id = ${kantorId}`);
  await tx.execute(sql`update pekan_kerja set hari_kerja = 127 where kantor_id = ${kantorId}`);

  const t = await kirim("/auth/tautan", { isi: {} });
  await kirim("/auth/tautan/setujui", {
    isi: { kode: t.isi.kode, akun: { peran: "kolektor", nama: "Andi" } },
    token: bos.tokenAkses,
  });
  const kolektor = (await kirim(`/auth/tautan/${t.isi.id}/klaim`, { isi: { klaim: t.isi.klaim } }))
    .isi as Sesi;
  return { app, kirim, bos, kolektor, kantorId };
}
