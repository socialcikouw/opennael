import { describe, expect, test } from "bun:test";
import { angka, bacaUang, persen, rupiah, tulisUang } from "./uang";

describe("format uang", () => {
  test("rupiah: pemisah ribuan titik, negatif memakai minus", () => {
    expect(rupiah(1_250_000)).toBe("Rp 1.250.000");
    expect(rupiah(0)).toBe("Rp 0");
    expect(rupiah(-200_000)).toBe("−Rp 200.000");
  });

  test("angka & persen", () => {
    expect(angka(1234567)).toBe("1.234.567");
    expect(persen(90)).toBe("90%");
    expect(persen(87.25)).toBe("87,3%");
  });

  test("ketikan uang: hanya digit, kosong = 0, 0 ditulis kosong", () => {
    expect(bacaUang("Rp 1.250.000")).toBe(1_250_000);
    expect(bacaUang("")).toBe(0);
    expect(tulisUang(1_250_000)).toBe("1.250.000");
    expect(tulisUang(0)).toBe("");
  });
});
