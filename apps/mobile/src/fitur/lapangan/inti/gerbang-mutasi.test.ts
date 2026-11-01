import { describe, expect, test } from "bun:test";
import { hitungGerbangMutasi } from "./gerbang-mutasi";

const MASUK = { absensi: "masuk_kerja" as const, laporanDibukaAt: null };
const g = (ubah: Partial<Parameters<typeof hitungGerbangMutasi>[0]> = {}) =>
  hitungGerbangMutasi({ hari: MASUK, pinjaman: 5, belum: 0, adaCatatan: false, ...ubah });

describe("gerbang Mutasi kas", () => {
  test("urut alur hari: memuat → belum absen → tidak kerja", () => {
    expect(g({ hari: undefined })).toBe("memuat");
    expect(g({ hari: null })).toBe("belum-absen");
    expect(g({ hari: { absensi: "tidak_kerja", laporanDibukaAt: null } })).toBe("tidak-kerja");
  });

  test("masih ada yang wajib belum dicatat → tergembok", () => {
    expect(g({ belum: 2 })).toBe("masih-menagih");
  });

  test("daftar tagih belum dimuat menahan, bukan membuka", () => {
    expect(g({ pinjaman: null })).toBe("memuat");
  });

  test("nol nasabah karena belum punya ≠ nol karena semua dilunasi hari ini", () => {
    expect(g({ pinjaman: 0 })).toBe("belum-ada-nasabah");
    expect(g({ pinjaman: 0, adaCatatan: true })).toBe("siap");
  });

  test("semua tercatat → terbuka; laporan yang sudah dibuka selalu terbuka", () => {
    expect(g()).toBe("siap");
    expect(g({ hari: { ...MASUK, laporanDibukaAt: "2026-11-02T08:00:00Z" }, belum: 3 })).toBe(
      "siap",
    );
  });
});
