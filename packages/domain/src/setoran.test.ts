import { describe, expect, test } from "bun:test";
import { hitungBayar, hitungLunas, storting } from "./setoran";
import { kode } from "./uji";

/** Contoh angka = docs/aturan-usaha.md, apa adanya. */

describe("C. setoran", () => {
  const harian = { jenis: "harian" as const, saldo: 600_000 };

  test("nominal per jenis (C1)", () => {
    expect(hitungBayar(harian, 50_000, 0).sisaSaldo).toBe(550_000);
    expect(kode(() => hitungBayar(harian, 52_000, 0))).toBe("NOMINAL_SETORAN_TIDAK_SESUAI");
    expect(kode(() => hitungBayar(harian, 0, 0))).toBe("SETORAN_NOL");
    expect(hitungBayar({ jenis: "mingguan", saldo: 120_000 }, 12_000, 0).sisaSaldo).toBe(108_000);
    expect(kode(() => hitungBayar({ jenis: "mingguan", saldo: 120_000 }, 12_500, 0))).toBe(
      "NOMINAL_SETORAN_TIDAK_SESUAI",
    );
    expect(kode(() => hitungBayar({ jenis: "tempoan", saldo: 1_250_000 }, 50_000, 0))).toBe(
      "TEMPOAN_TIDAK_BISA_DICICIL",
    );
  });

  test("setoran yang menghabiskan saldo wajib lewat lunas (C2)", () => {
    expect(kode(() => hitungBayar(harian, 600_000, 0))).toBe("SETORAN_HARUS_LEWAT_LUNAS");
    expect(kode(() => hitungBayar(harian, 550_000, 100_000))).toBe("SETORAN_HARUS_LEWAT_LUNAS");
  });
});

describe("D. pelunasan", () => {
  test("tabel contoh D1", () => {
    expect(hitungLunas(300_000, 100_000)).toEqual({
      setoranMurni: 200_000,
      setoranPelunasan: 100_000,
      tabunganKeluar: 100_000,
      storting: 200_000,
    });
    const lebih = hitungLunas(300_000, 500_000);
    expect(lebih).toEqual({
      setoranMurni: 0,
      setoranPelunasan: 300_000,
      tabunganKeluar: 500_000,
      storting: -200_000,
    });
    expect(storting(lebih)).toBe(lebih.storting);
  });
});
