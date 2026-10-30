import { describe, expect, test } from "bun:test";
import { angsuranKe, syaratAkad, syaratMigrasi } from "./akad";
import { kode } from "./uji";

/** Contoh angka = docs/aturan-usaha.md, apa adanya. */

describe("A. akad", () => {
  test("tabel contoh A5", () => {
    expect(syaratAkad("harian", 1_000_000, 24)).toMatchObject({
      potonganAdmin: 50_000,
      tabunganMasuk: 50_000,
      pencairan: 900_000,
      totalKembali: 1_200_000,
      angsuran: 50_000,
    });
    expect(syaratAkad("mingguan", 1_000_000, 8)).toMatchObject({
      pencairan: 900_000,
      angsuran: 150_000,
    });
    expect(syaratAkad("mingguan", 100_000, 10)).toMatchObject({
      potonganAdmin: 5_000,
      pencairan: 90_000,
      totalKembali: 120_000,
      angsuran: 12_000,
    });
    expect(syaratAkad("tempoan", 1_000_000, 14)).toMatchObject({
      potonganAdmin: 0,
      tabunganMasuk: 0,
      pencairan: 1_000_000,
      totalKembali: 1_250_000,
      angsuran: 1_250_000,
    });
  });

  test("A1 & A2 menolak pokok dan tenor tak sah", () => {
    expect(kode(() => syaratAkad("harian", 150_000, 24))).toBe("POKOK_TIDAK_SAH");
    expect(kode(() => syaratAkad("harian", 0, 24))).toBe("POKOK_TIDAK_SAH");
    expect(kode(() => syaratAkad("harian", 1_000_000, 20))).toBe("TENOR_TIDAK_BERLAKU");
    expect(kode(() => syaratAkad("tempoan", 1_000_000, 30))).toBe("TENOR_TIDAK_BERLAKU");
  });

  test("angsuran ke = angsuran yang sudah lunas", () => {
    expect(angsuranKe({ totalKembali: 1_200_000, saldo: 600_000, angsuran: 50_000 })).toBe(12);
    expect(angsuranKe({ totalKembali: 1_200_000, saldo: 625_000, angsuran: 50_000 })).toBe(11);
  });
});

describe("A10. salinan migrasi", () => {
  test("contoh A10: harian, 10 angsuran terbayar", () => {
    expect(syaratMigrasi("harian", 1_000_000, 24, 700_000, 50_000)).toMatchObject({
      totalKembali: 1_200_000,
      angsuran: 50_000,
      angsuranKe: 10,
      saldoAwal: 700_000,
      potonganAdmin: 0,
      pencairan: 0,
      tabunganMasuk: 50_000,
    });
  });

  test("saldo & tabungan di luar batas ditolak", () => {
    expect(kode(() => syaratMigrasi("harian", 1_000_000, 24, 0, 0))).toBe(
      "SALDO_MIGRASI_TIDAK_SAH",
    );
    expect(kode(() => syaratMigrasi("harian", 1_000_000, 24, 1_200_001, 0))).toBe(
      "SALDO_MIGRASI_TIDAK_SAH",
    );
    expect(kode(() => syaratMigrasi("tempoan", 1_000_000, 14, 1_250_000, -1))).toBe(
      "TABUNGAN_MIGRASI_TIDAK_SAH",
    );
    expect(kode(() => syaratMigrasi("harian", 1_050_000, 24, 100_000, 0))).toBe("POKOK_TIDAK_SAH");
  });
});
