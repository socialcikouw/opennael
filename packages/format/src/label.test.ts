import { describe, expect, test } from "bun:test";
import { LABEL_JENIS, LABEL_PERISTIWA, namaTenor } from "./label";

describe("label", () => {
  test("jenis pinjaman & satuan tenor (A2)", () => {
    expect(LABEL_JENIS.tempoan).toBe("Tempoan");
    expect(namaTenor("harian", 25)).toBe("25×");
    expect(namaTenor("tempoan", 6)).toBe("6 hari kerja");
  });

  test("peristiwa = jenis transaksi + libur", () => {
    expect(Object.keys(LABEL_PERISTIWA)).toEqual(["angsuran", "pelunasan", "gulung", "libur"]);
  });
});
