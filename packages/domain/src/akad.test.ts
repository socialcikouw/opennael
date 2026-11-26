import { describe, expect, test } from "bun:test";
import { angsuranKe, rincianPokok, syaratAkad, syaratMigrasi, tenorTunggal } from "./akad";
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
      potonganAdmin: 100_000,
      tabunganMasuk: 0,
      pencairan: 900_000,
      totalKembali: 1_200_000,
      angsuran: 150_000,
    });
    expect(syaratAkad("mingguan", 100_000, 8)).toMatchObject({
      potonganAdmin: 10_000,
      tabunganMasuk: 0,
      pencairan: 90_000,
      totalKembali: 120_000,
      angsuran: 15_000,
    });
    expect(syaratAkad("tempoan", 1_000_000, 14)).toMatchObject({
      potonganAdmin: 50_000,
      tabunganMasuk: 50_000,
      pencairan: 900_000,
      totalKembali: 1_250_000,
      angsuran: 1_250_000,
    });
  });

  test("rincian pokok per jenis, tanpa tenor (A3)", () => {
    const biasa = {
      potonganAdmin: 50_000,
      tabunganMasuk: 50_000,
      pencairan: 900_000,
      totalKembali: 1_250_000,
    };
    expect(rincianPokok("harian", 1_000_000)).toEqual(biasa);
    expect(rincianPokok("tempoan", 1_000_000)).toEqual(biasa);
    expect(rincianPokok("mingguan", 1_000_000)).toEqual({
      potonganAdmin: 100_000,
      tabunganMasuk: 0,
      pencairan: 900_000,
      totalKembali: 1_200_000,
    });
    expect(kode(() => rincianPokok("harian", 150_000))).toBe("POKOK_TIDAK_SAH");
  });

  test("mingguan 8 kali: angsuran selalu kelipatan Rp 5.000 (A1–A3)", () => {
    for (let pokok = 100_000; pokok <= 10_000_000; pokok += 100_000) {
      expect(syaratAkad("mingguan", pokok, 8).angsuran % 5_000).toBe(0);
    }
  });

  test("A1 & A2 menolak pokok dan tenor tak sah", () => {
    expect(kode(() => syaratAkad("harian", 150_000, 25))).toBe("POKOK_TIDAK_SAH");
    expect(kode(() => syaratAkad("harian", 0, 25))).toBe("POKOK_TIDAK_SAH");
    expect(kode(() => syaratAkad("harian", 1_000_000, 20))).toBe("TENOR_TIDAK_BERLAKU");
    expect(kode(() => syaratAkad("harian", 1_000_000, 24))).toBe("TENOR_TIDAK_BERLAKU");
    expect(kode(() => syaratAkad("tempoan", 1_000_000, 30))).toBe("TENOR_TIDAK_BERLAKU");
    // Mingguan hanya 8 kali (keputusan pemilik 26 Nov 2026).
    expect(kode(() => syaratAkad("mingguan", 1_000_000, 6))).toBe("TENOR_TIDAK_BERLAKU");
    expect(kode(() => syaratAkad("mingguan", 1_000_000, 10))).toBe("TENOR_TIDAK_BERLAKU");
  });

  test("tenor tunggal: harian 25, mingguan 8; tempoan dipilih", () => {
    expect(tenorTunggal("harian")).toBe(25);
    expect(tenorTunggal("mingguan")).toBe(8);
    expect(tenorTunggal("tempoan")).toBeNull();
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
