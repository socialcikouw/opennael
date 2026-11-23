import { describe, expect, test } from "bun:test";
import { bacaPilihan, harusGelap, pilihanBerikut } from "./tema";

describe("tema web bos", () => {
  test("nilai tersimpan tak dikenal atau kosong = ikuti perangkat", () => {
    expect(bacaPilihan(null)).toBe("sistem");
    expect(bacaPilihan("ungu")).toBe("sistem");
    expect(bacaPilihan("terang")).toBe("terang");
    expect(bacaPilihan("gelap")).toBe("gelap");
  });

  test("gelap hanya bila dipilih gelap, atau ikuti perangkat yang sedang gelap", () => {
    expect(harusGelap("gelap", false)).toBe(true);
    expect(harusGelap("terang", true)).toBe(false);
    expect(harusGelap("sistem", true)).toBe(true);
    expect(harusGelap("sistem", false)).toBe(false);
  });

  test("tombol berputar: ikuti perangkat → terang → gelap → ikuti perangkat", () => {
    expect(pilihanBerikut("sistem")).toBe("terang");
    expect(pilihanBerikut("terang")).toBe("gelap");
    expect(pilihanBerikut("gelap")).toBe("sistem");
  });
});
