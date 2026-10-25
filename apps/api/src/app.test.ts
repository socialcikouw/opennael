import { describe, expect, test } from "bun:test";
import { sehatSchema } from "@opennael/contracts";
import { buatApp } from "./app";
import type { Db } from "./db/klien";
import { pastikanDatabasePengembangan } from "./db/penjaga";
import { bacaEnv } from "./env";
import { kalenderGerbang, VALIDASI_PENUH } from "./modul/lapangan/gerbang";

describe("app", () => {
  // Rute di sini tidak menyentuh database.
  const app = buatApp({ db: {} as Db, jwtRahasia: "x".repeat(32), sesiRahasia: "y".repeat(32) });

  test("GET /sehat menjawab sesuai kontrak", async () => {
    const res = await app.request("/sehat");
    expect(res.status).toBe(200);
    expect(sehatSchema.safeParse(await res.json()).success).toBe(true);
  });

  test("dokumen OpenAPI memuat rute sistem & auth", async () => {
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { paths: Record<string, unknown> };
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        "/sehat",
        "/auth/register",
        "/auth/login",
        "/auth/refresh",
        "/auth/keluar",
        "/auth/me",
      ]),
    );
  });
});

describe("env", () => {
  const wajib = {
    DATABASE_URL: "postgresql://u:p@db.contoh.supabase.com:6543/postgres",
    JWT_RAHASIA: "a".repeat(32),
    SESI_RAHASIA: "b".repeat(32),
  };

  test("PORT bawaan 3000, registrasi tertutup bila kode kosong", () => {
    const env = bacaEnv(wajib);
    expect(env.PORT).toBe(3000);
    expect(env.KODE_REGISTRASI).toBeUndefined();
    expect(bacaEnv({ ...wajib, KODE_REGISTRASI: "" }).KODE_REGISTRASI).toBeUndefined();
  });

  test("PORT tidak sah ditolak", () => {
    expect(() => bacaEnv({ ...wajib, PORT: "bukan-angka" })).toThrow(
      "Variabel lingkungan tidak sah",
    );
  });

  test("DATABASE_URL wajib dan harus postgres", () => {
    expect(() => bacaEnv({ ...wajib, DATABASE_URL: undefined })).toThrow(
      "Variabel lingkungan tidak sah",
    );
    expect(() => bacaEnv({ ...wajib, DATABASE_URL: "mysql://u:p@h/db" })).toThrow(
      "Variabel lingkungan tidak sah",
    );
  });

  test("rahasia pendek ditolak", () => {
    expect(() => bacaEnv({ ...wajib, JWT_RAHASIA: "pendek" })).toThrow("JWT_RAHASIA minimal 32");
  });

  test("gerbang kalender: bawaan diperiksa; false hanya ke Supabase pengembangan", () => {
    const vps = { ...wajib, DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/opennael" };
    expect(bacaEnv(vps)).toMatchObject({
      VALIDASI_JAM_KERJA: true,
      VALIDASI_HARI_KERJA: true,
      VALIDASI_LIBUR_KANTOR: true,
    });
    expect(bacaEnv({ ...vps, VALIDASI_JAM_KERJA: "true" }).VALIDASI_JAM_KERJA).toBe(true);
    expect(() => bacaEnv({ ...vps, VALIDASI_LIBUR_KANTOR: "false" })).toThrow(
      "VALIDASI_LIBUR_KANTOR=false hanya boleh ke Supabase pengembangan",
    );
    expect(
      bacaEnv({
        ...wajib,
        VALIDASI_JAM_KERJA: "false",
        VALIDASI_HARI_KERJA: "false",
        VALIDASI_LIBUR_KANTOR: "false",
      }),
    ).toMatchObject({
      VALIDASI_JAM_KERJA: false,
      VALIDASI_HARI_KERJA: false,
      VALIDASI_LIBUR_KANTOR: false,
    });
    expect(() => bacaEnv({ ...wajib, VALIDASI_JAM_KERJA: "mungkin" })).toThrow(
      "Variabel lingkungan tidak sah",
    );
  });
});

describe("kalender gerbang", () => {
  const kal = {
    tanggal: "2026-10-26",
    dalamJamKerja: false,
    hariKerja: false,
    liburKantor: "Maulid",
  };

  test("semua diperiksa: kalender apa adanya", () => {
    expect(kalenderGerbang(kal, VALIDASI_PENUH)).toEqual(kal);
  });

  test("tiap saklar hanya melonggarkan pemeriksaannya sendiri", () => {
    expect(kalenderGerbang(kal, { ...VALIDASI_PENUH, jamKerja: false })).toEqual({
      ...kal,
      dalamJamKerja: true,
    });
    expect(kalenderGerbang(kal, { ...VALIDASI_PENUH, hariKerja: false })).toEqual({
      ...kal,
      hariKerja: true,
    });
    expect(kalenderGerbang(kal, { ...VALIDASI_PENUH, liburKantor: false })).toEqual({
      ...kal,
      liburKantor: null,
    });
    // Tanggal pembukuan tidak pernah ikut berubah.
    expect(
      kalenderGerbang(kal, { jamKerja: false, hariKerja: false, liburKantor: false }).tanggal,
    ).toBe("2026-10-26");
  });
});

describe("penjaga database pengembangan", () => {
  test("hanya Supabase yang diizinkan", () => {
    expect(() =>
      pastikanDatabasePengembangan("postgresql://u:p@x.pooler.supabase.com:6543/postgres"),
    ).not.toThrow();
    expect(() => pastikanDatabasePengembangan("postgresql://u:p@10.0.0.5:5432/nael")).toThrow(
      "bukan Supabase pengembangan",
    );
    expect(() => pastikanDatabasePengembangan(undefined)).toThrow("tidak sah");
  });
});
