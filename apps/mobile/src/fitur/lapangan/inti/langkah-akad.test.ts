import { describe, expect, test } from "bun:test";
import {
  langkahBerikut,
  langkahSebelum,
  nomorLangkah,
  perkiraanJatuhTempo,
  urutanLangkah,
} from "./langkah-akad";

describe("urutanLangkah", () => {
  test("nasabah baru: data satu lembar, kampung, jenis, pokok, foto, lalu periksa", () => {
    expect(urutanLangkah("baru")).toEqual([
      "siapa",
      "data",
      "kampung",
      "jenis",
      "pokok",
      "foto",
      "periksa",
    ]);
  });

  test("pernah melunasi: satu langkah memilih nasabah menggantikan tiga isian", () => {
    expect(urutanLangkah("pernah-melunasi")).toEqual([
      "siapa",
      "pernah-melunasi",
      "jenis",
      "pokok",
      "foto",
      "periksa",
    ]);
  });

  test("sebelum memilih, hitungan memakai jalur terpanjang (nasabah baru)", () => {
    expect(urutanLangkah(null)).toEqual(urutanLangkah("baru"));
  });
});

describe("pindah langkah", () => {
  const urutan = urutanLangkah("baru");

  test("berikut & sebelum", () => {
    expect(langkahBerikut(urutan, "siapa")).toBe("data");
    expect(langkahBerikut(urutan, "kampung")).toBe("jenis");
    expect(langkahBerikut(urutan, "jenis")).toBe("pokok");
    expect(langkahBerikut(urutan, "pokok")).toBe("foto");
    expect(langkahBerikut(urutan, "foto")).toBe("periksa");
    expect(langkahSebelum(urutan, "data")).toBe("siapa");
    expect(langkahSebelum(urutan, "foto")).toBe("pokok");
  });

  test("ujung: periksa tetap periksa, siapa tak punya sebelum", () => {
    expect(langkahBerikut(urutan, "periksa")).toBe("periksa");
    expect(langkahSebelum(urutan, "siapa")).toBeNull();
  });

  test("nomor langkah untuk bilah kemajuan", () => {
    expect(nomorLangkah(urutan, "siapa")).toBe(1);
    expect(nomorLangkah(urutan, "periksa")).toBe(urutan.length);
  });
});

describe("perkiraan jatuh tempo tempoan (A4)", () => {
  test("6 hari kerja Senin–Sabtu sesudah hari akad", () => {
    // Kamis 26 Nov → Jum, Sab, Sen, Sel, Rab, Kam = Kamis 3 Des (contoh A4).
    expect(perkiraanJatuhTempo("2026-11-26")).toBe("2026-12-03");
    // Sabtu 28 Nov → Sen 30 … Sab 5 Des.
    expect(perkiraanJatuhTempo("2026-11-28")).toBe("2026-12-05");
  });
});
