import { describe, expect, test } from "bun:test";
import { DIGIT_MAKS, hapusSatu, ketik, nilaiDigit } from "./papan";

describe("papan angka bayar", () => {
  test("nol di depan diabaikan; 00 & 000 menambah nol di belakang", () => {
    expect(ketik("", "0")).toBe("");
    expect(ketik("", "000")).toBe("");
    expect(ketik(ketik("", "5"), "000")).toBe("5000");
    expect(ketik("50", "00")).toBe("5000");
    expect(nilaiDigit("50000")).toBe(50_000);
    expect(nilaiDigit("")).toBe(0);
  });

  test("hapus satu digit & batas panjang", () => {
    expect(hapusSatu("5000")).toBe("500");
    expect(hapusSatu("")).toBe("");
    expect(ketik("9".repeat(DIGIT_MAKS - 1), "000")).toHaveLength(DIGIT_MAKS);
  });
});
