import { describe, expect, test } from "bun:test";
import { hitungGulung, type PinjamanAsal, statusGulung } from "./gulung";
import { kode } from "./uji";

/** Contoh angka = docs/aturan-usaha.md, apa adanya. */

describe("E. gulung", () => {
  const terbuka = { gulungDikunci: false, naikDikunci: false };
  const asal: PinjamanAsal = {
    jenis: "harian",
    status: "berjalan",
    pokok: 1_000_000,
    saldo: 650_000,
    pinjamanKe: 4,
    angsuranKe: 12,
  };

  test("contoh E7: naik 1 jt → 1,5 jt di angsuran ke-12", () => {
    const r = hitungGulung(asal, 1_500_000, 25, terbuka);
    expect(r.jenisGulung).toBe("naik");
    expect(r.syarat.pencairan).toBe(1_350_000);
    expect(r.pencairan).toBe(700_000);
    expect(r).toMatchObject({
      saldoLama: 650_000,
      dropBaru: 500_000,
      dropGulung: 1_000_000,
      pokokBerkurang: 0,
    });
  });

  test("droping tetap & turun (E7)", () => {
    expect(hitungGulung(asal, 1_000_000, 25, terbuka)).toMatchObject({
      jenisGulung: "tetap",
      dropBaru: 0,
      dropGulung: 1_000_000,
    });
    expect(hitungGulung(asal, 800_000, 25, terbuka)).toMatchObject({
      jenisGulung: "turun",
      dropGulung: 800_000,
      pokokBerkurang: 200_000,
    });
  });

  test("rem bos diperiksa lebih dulu (E3)", () => {
    expect(
      kode(() => hitungGulung(asal, 1_000_000, 25, { gulungDikunci: true, naikDikunci: false })),
    ).toBe("GULUNG_PINJAMAN_DIKUNCI");
    expect(
      kode(() => hitungGulung(asal, 1_500_000, 25, { gulungDikunci: false, naikDikunci: true })),
    ).toBe("NAIK_PINJAMAN_DIKUNCI");
    // Rem naik tak menghalangi gulung tetap.
    expect(
      hitungGulung(asal, 1_000_000, 25, { gulungDikunci: false, naikDikunci: true }).jenisGulung,
    ).toBe("tetap");
  });

  test("tambahan harian (E4)", () => {
    expect(kode(() => hitungGulung({ ...asal, status: "macet" }, 1_000_000, 25, terbuka))).toBe(
      "GULUNG_PINJAMAN_MACET",
    );
    expect(
      kode(() => hitungGulung({ ...asal, pinjamanKe: 1, angsuranKe: 12 }, 1_500_000, 25, terbuka)),
    ).toBe("GULUNG_PERTAMA_TIDAK_BOLEH_NAIK");
    expect(
      kode(() => hitungGulung({ ...asal, pinjamanKe: 3, angsuranKe: 11 }, 1_000_000, 25, terbuka)),
    ).toBe("GULUNG_ANGSURAN_BELUM_CUKUP");
    expect(
      hitungGulung(
        { ...asal, pinjamanKe: 4, angsuranKe: 10, saldo: 750_000 },
        1_000_000,
        25,
        terbuka,
      ),
    ).toBeTruthy();
    expect(
      kode(() => hitungGulung({ ...asal, angsuranKe: 9, saldo: 800_000 }, 1_000_000, 25, terbuka)),
    ).toBe("GULUNG_ANGSURAN_BELUM_CUKUP");
  });

  test("mingguan boleh digulung saat macet & naik di pinjaman pertama (E5)", () => {
    const mingguan: PinjamanAsal = {
      jenis: "mingguan",
      status: "macet",
      pokok: 1_000_000,
      saldo: 900_000,
      pinjamanKe: 1,
      angsuranKe: 2,
    };
    expect(hitungGulung(mingguan, 2_000_000, 8, terbuka).pencairan).toBe(900_000);
  });

  test("tempoan tidak bisa digulung (E5)", () => {
    const tempoan: PinjamanAsal = {
      jenis: "tempoan",
      status: "berjalan",
      pokok: 1_000_000,
      saldo: 1_250_000,
      pinjamanKe: 1,
      angsuranKe: 0,
    };
    expect(kode(() => hitungGulung(tempoan, 3_000_000, 14, terbuka))).toBe("GULUNG_TEMPOAN");
    expect(statusGulung(tempoan)).toBe("terkunci");
    expect(statusGulung({ ...tempoan, status: "macet" })).toBe("terkunci");
  });

  test("pencairan bersih harus lebih dari nol (E6) & asal masih ditagih (E2)", () => {
    expect(kode(() => hitungGulung({ ...asal, saldo: 900_000 }, 1_000_000, 25, terbuka))).toBe(
      "GULUNG_PENCAIRAN_TIDAK_CUKUP",
    );
    expect(kode(() => hitungGulung({ ...asal, status: "lunas" }, 1_000_000, 25, terbuka))).toBe(
      "PINJAMAN_SUDAH_SELESAI",
    );
  });
});
