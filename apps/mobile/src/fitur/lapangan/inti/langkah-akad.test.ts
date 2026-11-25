import { describe, expect, test } from "bun:test";
import { langkahBerikut, langkahSebelum, nomorLangkah, urutanLangkah } from "./langkah-akad";

describe("urutanLangkah", () => {
  test("nasabah baru mingguan: nama, kampung, kontak, lalu pokok sebelum tenor", () => {
    expect(urutanLangkah("baru", "mingguan")).toEqual([
      "foto",
      "siapa",
      "nama",
      "kampung",
      "kontak",
      "pokok",
      "tenor",
      "periksa",
    ]);
  });

  test("pernah melunasi: satu langkah memilih nasabah menggantikan tiga isian", () => {
    expect(urutanLangkah("pernah-melunasi", "tempoan")).toEqual([
      "foto",
      "siapa",
      "pernah-melunasi",
      "pokok",
      "tenor",
      "periksa",
    ]);
  });

  test("harian tanpa langkah tenor (selalu 24 kali)", () => {
    expect(urutanLangkah("baru", "harian")).not.toContain("tenor");
    expect(urutanLangkah("pernah-melunasi", "harian")).toEqual([
      "foto",
      "siapa",
      "pernah-melunasi",
      "pokok",
      "periksa",
    ]);
  });

  test("sebelum memilih siapa, hitungan memakai jalur nasabah baru", () => {
    expect(urutanLangkah(null, "harian")).toEqual(urutanLangkah("baru", "harian"));
  });
});

describe("pindah langkah", () => {
  const urutan = urutanLangkah("baru", "mingguan");

  test("berikut & sebelum", () => {
    expect(langkahBerikut(urutan, "siapa")).toBe("nama");
    expect(langkahBerikut(urutan, "pokok")).toBe("tenor");
    expect(langkahSebelum(urutan, "nama")).toBe("siapa");
    expect(langkahSebelum(urutan, "siapa")).toBe("foto");
  });

  test("ujung: periksa tetap periksa, foto tak punya sebelum", () => {
    expect(langkahBerikut(urutan, "periksa")).toBe("periksa");
    expect(langkahSebelum(urutan, "foto")).toBeNull();
  });

  test("nomor langkah untuk bilah kemajuan", () => {
    expect(nomorLangkah(urutan, "foto")).toBe(1);
    expect(nomorLangkah(urutan, "periksa")).toBe(urutan.length);
  });
});
