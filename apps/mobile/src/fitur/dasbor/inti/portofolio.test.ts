import { describe, expect, test } from "bun:test";
import type { Portofolio } from "@opennael/contracts";
import { portofolioUntuk } from "./portofolio";

const nol = { jumlah: 0, saldo: 0 };
const DATA: Portofolio = {
  harian: {
    berjalan: { jumlah: 40, saldo: 20_000_000 },
    macet: { jumlah: 3, saldo: 1_500_000 },
    diputihkan: { jumlah: 1, saldo: 800_000 },
  },
  mingguan: {
    berjalan: { jumlah: 10, saldo: 9_000_000 },
    macet: nol,
    diputihkan: nol,
  },
  tempoan: {
    berjalan: { jumlah: 2, saldo: 2_500_000 },
    macet: { jumlah: 1, saldo: 1_250_000 },
    diputihkan: { jumlah: 2, saldo: 2_000_000 },
  },
};

describe("portofolioUntuk", () => {
  test("tiap mode mengambil jenisnya sendiri", () => {
    expect(portofolioUntuk(DATA, "harian")).toBe(DATA.harian);
    expect(portofolioUntuk(DATA, "mingguan")).toBe(DATA.mingguan);
    expect(portofolioUntuk(DATA, "tempoan")).toBe(DATA.tempoan);
  });

  test("ketiga mode menghasilkan angka berbeda", () => {
    const saldo = (j: "harian" | "mingguan" | "tempoan") => portofolioUntuk(DATA, j).berjalan.saldo;
    expect(new Set([saldo("harian"), saldo("mingguan"), saldo("tempoan")]).size).toBe(3);
  });

  test("Semua menjumlah ketiga jenis di tiap status", () => {
    expect(portofolioUntuk(DATA, null)).toEqual({
      berjalan: { jumlah: 52, saldo: 31_500_000 },
      macet: { jumlah: 4, saldo: 2_750_000 },
      diputihkan: { jumlah: 3, saldo: 2_800_000 },
    });
  });
});
