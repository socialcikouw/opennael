import { describe, expect, test } from "bun:test";
import type { Portofolio } from "@opennael/contracts";
import {
  kartuAngsuran,
  kartuNasabah,
  piutangAktif,
  portofolioUntuk,
  sorotSaldoAkhir,
  susunKartuPortofolio,
} from "./portofolio";

const nol = { jumlah: 0, saldo: 0, angsuran: 0, tabungan: 0 };
const DATA: Portofolio = {
  harian: {
    berjalan: { jumlah: 40, saldo: 20_000_000, angsuran: 2_000_000, tabungan: 3_000_000 },
    macet: { jumlah: 3, saldo: 1_500_000, angsuran: 150_000, tabungan: 100_000 },
    diputihkan: { jumlah: 1, saldo: 800_000, angsuran: 50_000, tabungan: 0 },
    lunas: { jumlah: 120 },
  },
  mingguan: {
    berjalan: { jumlah: 10, saldo: 9_000_000, angsuran: 1_500_000, tabungan: 0 },
    macet: nol,
    diputihkan: nol,
    lunas: { jumlah: 8 },
  },
  tempoan: {
    berjalan: { jumlah: 2, saldo: 2_500_000, angsuran: 2_500_000, tabungan: 0 },
    macet: { jumlah: 1, saldo: 1_250_000, angsuran: 1_250_000, tabungan: 0 },
    diputihkan: { jumlah: 2, saldo: 2_000_000, angsuran: 2_000_000, tabungan: 0 },
    lunas: { jumlah: 4 },
  },
};

describe("portofolioUntuk", () => {
  test("satu jenis mengambil jenisnya sendiri", () => {
    expect(portofolioUntuk(DATA, "harian")).toBe(DATA.harian);
    expect(portofolioUntuk(DATA, "tempoan")).toBe(DATA.tempoan);
  });

  test("semua jenis: tiap status & lunas dijumlah", () => {
    expect(portofolioUntuk(DATA, null)).toEqual({
      berjalan: { jumlah: 52, saldo: 31_500_000, angsuran: 6_000_000, tabungan: 3_000_000 },
      macet: { jumlah: 4, saldo: 2_750_000, angsuran: 1_400_000, tabungan: 100_000 },
      diputihkan: { jumlah: 3, saldo: 2_800_000, angsuran: 2_050_000, tabungan: 0 },
      lunas: { jumlah: 132 },
    });
  });

  test("piutang aktif = berjalan + macet (diputihkan tidak)", () => {
    expect(piutangAktif(DATA.harian)).toEqual({ jumlah: 43, saldo: 21_500_000, macet: 3 });
  });
});

describe("kartu portofolio", () => {
  test("sorot saldo akhir: bar berjalan vs macet, lencana porsi macet", () => {
    const s = sorotSaldoAkhir(portofolioUntuk(DATA, null));
    expect(s).toMatchObject({
      label: "Saldo Akhir",
      nilai: 34_250_000,
      lencana: "8% macet",
      keping: [
        { label: "Saldo berjalan", nilai: 31_500_000 },
        { label: "Saldo macet", nilai: 2_750_000 },
      ],
    });
    expect(sorotSaldoAkhir(DATA.mingguan).lencana).toBeNull();
  });

  test("semua jenis: Per Jenis di depan; diputihkan hanya bila ada", () => {
    expect(susunKartuPortofolio(DATA, null).map((k) => k.kunci)).toEqual([
      "per-jenis",
      "nasabah",
      "angsuran",
      "tabungan",
      "diputihkan",
    ]);
    expect(susunKartuPortofolio(DATA, "mingguan").map((k) => k.kunci)).toEqual([
      "nasabah",
      "angsuran",
      "tabungan",
    ]);
  });

  test("nasabah aktif berupa hitungan; macet merah bila ada", () => {
    const k = kartuNasabah(DATA.harian);
    expect(k).toMatchObject({ nilai: 43, satuan: "nasabah" });
    expect(k.rincian.find((r) => r.label === "Macet")?.nada).toBe("bahaya");
    expect(
      kartuNasabah(DATA.mingguan).rincian.find((r) => r.label === "Macet")?.nada,
    ).toBeUndefined();
  });

  test("target angsuran tak dijumlah lintas jenis: semua jenis = harian", () => {
    expect(kartuAngsuran(DATA, null)).toMatchObject({
      judul: "Target Angsuran Harian",
      nilai: 2_150_000,
    });
    expect(kartuAngsuran(DATA, "mingguan").rumus).toBe(
      "Angsuran mingguan berjalan + macet, per minggu",
    );
  });
});
