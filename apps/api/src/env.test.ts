import { describe, expect, test } from "bun:test";
import { bacaEnv } from "./env";

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
