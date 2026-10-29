import { describe, expect, test } from "bun:test";
import { kalenderGerbang, VALIDASI_PENUH } from "./gerbang";

describe("kalender gerbang", () => {
  const kal = {
    tanggal: "2026-10-26",
    dalamJamKerja: false,
    hariKerja: false,
    liburKantor: "Maulid",
  };

  test("semua diperiksa: kalender apa adanya", () => {
    expect(kalenderGerbang(kal, VALIDASI_PENUH)).toEqual(kal);
  });

  test("tiap saklar hanya melonggarkan pemeriksaannya sendiri", () => {
    expect(kalenderGerbang(kal, { ...VALIDASI_PENUH, jamKerja: false })).toEqual({
      ...kal,
      dalamJamKerja: true,
    });
    expect(kalenderGerbang(kal, { ...VALIDASI_PENUH, hariKerja: false })).toEqual({
      ...kal,
      hariKerja: true,
    });
    expect(kalenderGerbang(kal, { ...VALIDASI_PENUH, liburKantor: false })).toEqual({
      ...kal,
      liburKantor: null,
    });
    // Tanggal pembukuan tidak pernah ikut berubah.
    expect(
      kalenderGerbang(kal, { jamKerja: false, hariKerja: false, liburKantor: false }).tanggal,
    ).toBe("2026-10-26");
  });
});
