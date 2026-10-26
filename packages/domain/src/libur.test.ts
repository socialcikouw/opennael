import { describe, expect, test } from "bun:test";
import { nomorGulungMinimal, statusGulung } from "./gulung";
import { tolakLibur } from "./libur";

describe("G. libur nasabah", () => {
  const kamis = "2026-10-29";

  test("G1 tempoan tak punya libur, G2 mingguan hanya di hari tagihnya", () => {
    expect(
      tolakLibur({ jenis: "tempoan", tanggalAkad: "2026-10-01", angsuranKe: 5 }, kamis)?.kode,
    ).toBe("LIBUR_TIDAK_BERLAKU");
    expect(
      tolakLibur({ jenis: "mingguan", tanggalAkad: "2026-10-26", angsuranKe: 5 }, kamis)?.kode,
    ).toBe("LIBUR_BUKAN_HARI_TAGIH");
    expect(
      tolakLibur({ jenis: "mingguan", tanggalAkad: "2026-10-01", angsuranKe: 3 }, kamis),
    ).toBeNull();
  });

  test("G3 angsuran terbayar 0–1 belum boleh libur", () => {
    const harian = { jenis: "harian" as const, tanggalAkad: "2026-10-01" };
    expect(tolakLibur({ ...harian, angsuranKe: 1 }, kamis)?.kode).toBe("LIBUR_BELUM_BOLEH");
    expect(tolakLibur({ ...harian, angsuranKe: 2 }, kamis)).toBeNull();
  });
});

describe("E. sinyal gulung kartu", () => {
  test("E4 harian: ambang 12 untuk pinjaman ke-1–3, 10 sesudahnya; macet terkunci", () => {
    expect(nomorGulungMinimal(3)).toBe(12);
    expect(nomorGulungMinimal(4)).toBe(10);
    const harian = { jenis: "harian" as const, status: "berjalan" as const, pinjamanKe: 2 };
    expect(statusGulung({ ...harian, angsuranKe: 11 })).toBe("belum");
    expect(statusGulung({ ...harian, angsuranKe: 12 })).toBe("boleh");
    expect(statusGulung({ ...harian, status: "macet", angsuranKe: 20 })).toBe("terkunci");
  });

  test("E5 mingguan & tempoan boleh kapan saja, termasuk macet; selesai terkunci", () => {
    const p = { pinjamanKe: 1, angsuranKe: 0 };
    expect(statusGulung({ ...p, jenis: "mingguan", status: "macet" })).toBe("boleh");
    expect(statusGulung({ ...p, jenis: "tempoan", status: "berjalan" })).toBe("boleh");
    expect(statusGulung({ ...p, jenis: "tempoan", status: "lunas" })).toBe("terkunci");
  });
});
