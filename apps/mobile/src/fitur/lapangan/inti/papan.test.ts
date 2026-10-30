import { describe, expect, test } from "bun:test";
import {
  DIGIT_MAKS,
  jumlahKetukan,
  KOSONGKAN,
  MUNDUR,
  nilaiDigit,
  POKOK_MAKS,
  tekanBayar,
  tekanPokok,
} from "./papan";

describe("papan bayar", () => {
  test("nol di depan diabaikan; 00 & 000 menambah nol di belakang", () => {
    expect(tekanBayar("", "0")).toBe("");
    expect(tekanBayar("", "000")).toBe("");
    expect(tekanBayar(tekanBayar("", "5"), "000")).toBe("5000");
    expect(tekanBayar("50", "00")).toBe("5000");
    expect(nilaiDigit("50000")).toBe(50_000);
    expect(nilaiDigit("")).toBe(0);
  });

  test("mundur satu digit, kosongkan, batas panjang", () => {
    expect(tekanBayar("5000", MUNDUR)).toBe("500");
    expect(tekanBayar("", MUNDUR)).toBe("");
    expect(tekanBayar("5000", KOSONGKAN)).toBe("");
    expect(tekanBayar("9".repeat(DIGIT_MAKS - 1), "000")).toHaveLength(DIGIT_MAKS);
  });
});

describe("papan pokok gulung", () => {
  test("setiap ketukan menambah; mundur membatalkan ketukan terakhir", () => {
    let k = tekanPokok([], "100k");
    expect(jumlahKetukan(k)).toBe(100_000);
    k = tekanPokok(k, "100k");
    expect(jumlahKetukan(k)).toBe(200_000);
    k = tekanPokok(k, "1000k");
    expect(jumlahKetukan(k)).toBe(1_200_000);
    k = tekanPokok(k, MUNDUR);
    expect(jumlahKetukan(k)).toBe(200_000);
    expect(tekanPokok(k, KOSONGKAN)).toEqual([]);
    expect(tekanPokok([], MUNDUR)).toEqual([]);
  });

  test("tak melewati batas atas", () => {
    const penuh = [POKOK_MAKS - 100_000];
    expect(jumlahKetukan(tekanPokok(penuh, "100k"))).toBe(POKOK_MAKS);
    expect(tekanPokok([POKOK_MAKS], "100k")).toEqual([POKOK_MAKS]);
  });
});
