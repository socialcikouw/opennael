import { describe, expect, test } from "bun:test";
import { langkahBerikut, langkahSebelum, nomorLangkah, urutanLangkah } from "./langkah-akad";

describe("urutanLangkah", () => {
  test("nasabah baru tempoan: nama, kampung, kontak, jenis, lalu pokok sebelum tenor", () => {
    expect(urutanLangkah("baru", "tempoan")).toEqual([
      "foto",
      "siapa",
      "nama",
      "kampung",
      "kontak",
      "jenis",
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
      "jenis",
      "pokok",
      "tenor",
      "periksa",
    ]);
  });

  test("harian & mingguan tanpa langkah tenor (selalu 25 & 8 kali)", () => {
    expect(urutanLangkah("baru", "harian")).not.toContain("tenor");
    expect(urutanLangkah("baru", "mingguan")).not.toContain("tenor");
    expect(urutanLangkah("pernah-melunasi", "harian")).toEqual([
      "foto",
      "siapa",
      "pernah-melunasi",
      "jenis",
      "pokok",
      "periksa",
    ]);
  });

  test("sebelum memilih, hitungan memakai jalur terpanjang (nasabah baru, bertenor)", () => {
    expect(urutanLangkah(null, "harian")).toEqual(urutanLangkah("baru", "harian"));
    expect(urutanLangkah("baru", null)).toEqual(urutanLangkah("baru", "tempoan"));
  });
});

describe("pindah langkah", () => {
  const urutan = urutanLangkah("baru", "tempoan");

  test("berikut & sebelum", () => {
    expect(langkahBerikut(urutan, "siapa")).toBe("nama");
    expect(langkahBerikut(urutan, "kontak")).toBe("jenis");
    expect(langkahBerikut(urutan, "jenis")).toBe("pokok");
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
