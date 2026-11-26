import { describe, expect, test } from "bun:test";
import {
  langkahBerikut,
  langkahSebelum,
  nomorLangkah,
  perkiraanJatuhTempo,
  urutanLangkah,
} from "./langkah-akad";

describe("urutanLangkah", () => {
  test("nasabah baru: nama, kampung, kontak, jenis, pokok, periksa (tanpa langkah tenor)", () => {
    expect(urutanLangkah("baru")).toEqual([
      "foto",
      "siapa",
      "nama",
      "kampung",
      "kontak",
      "jenis",
      "pokok",
      "periksa",
    ]);
  });

  test("pernah melunasi: satu langkah memilih nasabah menggantikan tiga isian", () => {
    expect(urutanLangkah("pernah-melunasi")).toEqual([
      "foto",
      "siapa",
      "pernah-melunasi",
      "jenis",
      "pokok",
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
    expect(langkahBerikut(urutan, "siapa")).toBe("nama");
    expect(langkahBerikut(urutan, "kontak")).toBe("jenis");
    expect(langkahBerikut(urutan, "jenis")).toBe("pokok");
    expect(langkahBerikut(urutan, "pokok")).toBe("periksa");
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

describe("perkiraan jatuh tempo tempoan (A4)", () => {
  test("6 hari kerja Senin–Sabtu sesudah hari akad", () => {
    // Kamis 26 Nov → Jum, Sab, Sen, Sel, Rab, Kam = Kamis 3 Des (contoh A4).
    expect(perkiraanJatuhTempo("2026-11-26")).toBe("2026-12-03");
    // Sabtu 28 Nov → Sen 30 … Sab 5 Des.
    expect(perkiraanJatuhTempo("2026-11-28")).toBe("2026-12-05");
  });
});
