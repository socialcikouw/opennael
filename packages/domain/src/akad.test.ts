import { describe, expect, test } from "bun:test";
import { angsuranKe, rincianPokok, syaratAkad, syaratMigrasi } from "./akad";
import { kode } from "./uji";

/** Contoh angka = docs/aturan-usaha.md, apa adanya. */

describe("A. akad", () => {
  test("tabel contoh A5", () => {
    expect(syaratAkad("harian", 1_000_000, 25)).toMatchObject({
      potonganAdmin: 50_000,
      tabunganMasuk: 50_000,
      pencairan: 900_000,
      totalKembali: 1_250_000,
      angsuran: 50_000,
    });
    expect(syaratAkad("mingguan", 1_000_000, 8)).toMatchObject({
      pencairan: 900_000,
      totalKembali: 1_250_000,
      angsuran: 156_250,
    });
    expect(syaratAkad("mingguan", 100_000, 10)).toMatchObject({
      potonganAdmin: 5_000,
      pencairan: 90_000,
      totalKembali: 125_000,
      angsuran: 12_500,
    });
    expect(syaratAkad("mingguan", 1_200_000, 6)).toMatchObject({
      pencairan: 1_080_000,
      totalKembali: 1_500_000,
      angsuran: 250_000,
    });
    expect(syaratAkad("tempoan", 1_000_000, 14)).toMatchObject({
      potonganAdmin: 50_000,
      tabunganMasuk: 50_000,
      pencairan: 900_000,
      totalKembali: 1_250_000,
      angsuran: 1_250_000,
    });
  });

  test("rincian pokok sama untuk semua jenis, tanpa tenor", () => {
    expect(rincianPokok(1_000_000)).toEqual({
      potonganAdmin: 50_000,
      tabunganMasuk: 50_000,
      pencairan: 900_000,
      totalKembali: 1_250_000,
    });
    expect(kode(() => rincianPokok(150_000))).toBe("POKOK_TIDAK_SAH");
  });

  test("A1 & A2 menolak pokok dan tenor tak sah", () => {
    expect(kode(() => syaratAkad("harian", 150_000, 25))).toBe("POKOK_TIDAK_SAH");
    expect(kode(() => syaratAkad("harian", 0, 25))).toBe("POKOK_TIDAK_SAH");
    expect(kode(() => syaratAkad("harian", 1_000_000, 20))).toBe("TENOR_TIDAK_BERLAKU");
    expect(kode(() => syaratAkad("harian", 1_000_000, 24))).toBe("TENOR_TIDAK_BERLAKU");
    expect(kode(() => syaratAkad("tempoan", 1_000_000, 30))).toBe("TENOR_TIDAK_BERLAKU");
    // Mingguan 6 kali: pokok kelipatan Rp 300.000 (125% ÷ 6 bulat).
    expect(kode(() => syaratAkad("mingguan", 1_000_000, 6))).toBe("POKOK_TIDAK_SAH");
    expect(syaratAkad("mingguan", 300_000, 6).angsuran).toBe(62_500);
  });

  test("angsuran ke = angsuran yang sudah lunas", () => {
    expect(angsuranKe({ totalKembali: 1_250_000, saldo: 650_000, angsuran: 50_000 })).toBe(12);
    expect(angsuranKe({ totalKembali: 1_250_000, saldo: 675_000, angsuran: 50_000 })).toBe(11);
  });
});

describe("A10. salinan migrasi", () => {
  test("contoh A10: harian, 10 angsuran terbayar", () => {
    expect(syaratMigrasi("harian", 1_000_000, 25, 750_000, 50_000)).toMatchObject({
      totalKembali: 1_250_000,
      angsuran: 50_000,
      angsuranKe: 10,
      saldoAwal: 750_000,
      potonganAdmin: 0,
      pencairan: 0,
      tabunganMasuk: 50_000,
    });
  });

  test("saldo & tabungan di luar batas ditolak", () => {
    expect(kode(() => syaratMigrasi("harian", 1_000_000, 25, 0, 0))).toBe(
      "SALDO_MIGRASI_TIDAK_SAH",
    );
    expect(kode(() => syaratMigrasi("harian", 1_000_000, 25, 1_250_001, 0))).toBe(
      "SALDO_MIGRASI_TIDAK_SAH",
    );
    expect(kode(() => syaratMigrasi("tempoan", 1_000_000, 14, 1_250_000, -1))).toBe(
      "TABUNGAN_MIGRASI_TIDAK_SAH",
    );
    expect(kode(() => syaratMigrasi("harian", 1_050_000, 25, 100_000, 0))).toBe("POKOK_TIDAK_SAH");
  });
});
