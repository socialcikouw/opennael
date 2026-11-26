import { describe, expect, test } from "bun:test";
import { persenSisaTerbesar, selisih, susunSegmen } from "./komposisi";

describe("komposisi & selisih", () => {
  test("persen sisa terbesar selalu berjumlah 100", () => {
    expect(persenSisaTerbesar([0.505, 0.495])).toEqual([51, 49]);
    expect(persenSisaTerbesar([1 / 3, 1 / 3, 1 / 3])).toEqual([34, 33, 33]);
  });

  test("bagian kecil bukan nol = <1%; semua nol = tanpa bar; negatif dianggap nol", () => {
    const s = susunSegmen([
      { label: "Besar", nilai: 150_000_000 },
      { label: "Kecil", nilai: 400_000 },
    ]);
    expect(s?.map((x) => x.persenTeks)).toEqual(["100%", "<1%"]);
    expect(susunSegmen([{ label: "A", nilai: 0 }])).toBeNull();
    expect(
      susunSegmen([
        { label: "A", nilai: -5 },
        { label: "B", nilai: 10 },
      ])?.[1]?.porsi,
    ).toBe(1);
  });

  test("selisih terhadap pembanding", () => {
    expect(selisih(1_120_000, 1_000_000, "Oktober 1–27")).toEqual({
      arah: "naik",
      teks: "12% dari Oktober 1–27",
    });
    expect(selisih(900, 1_000, "pekan lalu")).toEqual({
      arah: "turun",
      teks: "10% dari pekan lalu",
    });
    expect(selisih(5, 5, "pekan lalu")).toEqual({ arah: "tetap", teks: "sama dengan pekan lalu" });
    expect(selisih(0, 0, "x")).toBeNull();
    expect(selisih(500, 0, "September")?.teks).toBe("September: Rp 0");
  });
});
