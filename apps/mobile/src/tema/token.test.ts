import { describe, expect, test } from "bun:test";
import { rasioKontras } from "./kontras";
import { AKSEN_MODE, WARNA } from "./token";

/**
 * UJI TEMA — penjaga keterbacaan & kelengkapan token. Aplikasi hanya bertema gelap dan
 * dipakai kolektor di bawah matahari, jadi batasnya sengaja lebih ketat dari standar umum
 * (WCAG AA = 4,5:1): teks penting ≥ 7:1. Menambah / mengubah warna di `palet.ts` atau
 * `token.ts` yang membuat teks sulit dibaca akan menggagalkan uji ini.
 */

const W = WARNA as Record<string, string>;
/** Alas tempat teks biasa berada: latar layar, kartu, yang melayang, isi netral di dalam kartu. */
const ALAS = ["latar", "permukaan", "permukaanTinggi", "isiNetral"] as const;

/** Setiap teks `teks` harus terbaca di atas SEMUA alas `di`, minimal `minimal`:1. */
function periksaTeks(teks: readonly string[], di: readonly string[], minimal: number) {
  for (const t of teks) {
    for (const l of di) {
      const r = rasioKontras(W[t] as string, W[l] as string);
      expect(r, `${t} di atas ${l} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(minimal);
    }
  }
}

describe("kontras teks di atas alas", () => {
  test("teks penting (teks, teksTombol, teksLabel, teksKedua) ≥ 7:1 di atas semua alas", () => {
    periksaTeks(["teks", "teksTombol", "teksLabel", "teksKedua"], ALAS, 7);
  });

  test("teks penting ≥ 6,5:1 di atas isiNetralTegas (segmen aktif, tombol tertekan)", () => {
    periksaTeks(["teks", "teksTombol", "teksLabel", "teksKedua"], ["isiNetralTegas"], 6.5);
  });

  test("teks pendukung (redup) ≥ 4,5:1", () => {
    periksaTeks(["redup"], ALAS, 4.5);
  });

  test("teks samar (placeholder, penanda) ≥ 3:1 — bukan untuk data yang harus dibaca", () => {
    periksaTeks(["samar"], ALAS, 3);
  });

  test("teks beraksen (hijau, merah, kuning) ≥ 4,5:1", () => {
    periksaTeks(
      ["utama", "utamaTua", "bahayaTeks", "bahayaTua", "waspada", "waspadaTua"],
      ALAS,
      4.5,
    );
  });

  test("aksen yang dipakai di atas isiNetralTegas (segmen aktif) ≥ 4,5:1", () => {
    periksaTeks(["utamaTua"], ["isiNetralTegas"], 4.5);
  });
});

describe("kontras teks di atas isi berwarna", () => {
  const PASANGAN: [teks: string, isi: string, minimal: number][] = [
    ["teksAtasUtama", "utamaIsi", 4.5],
    // Dulu 2,8:1 & 3,8:1 (teks putih) — kekurangan lama yang diperbaiki Tahap 3.
    ["teksAtasBahaya", "bahaya", 4.5],
    ["teksAtasBahaya", "bahayaBingkai", 4.5],
    ["utamaTua", "utamaMuda", 4.5],
    ["bahayaTua", "bahayaMuda", 4.5],
    ["waspadaTua", "waspadaMuda", 4.5],
    ["utama", "utamaLembut", 4.5],
    ["bahayaTeks", "bahayaLembut", 4.5],
    ["waspada", "waspadaLembut", 4.5],
    ["diAtasFoto", "latarMedia", 7],
    ["tintaQr", "latarQr", 7],
  ];
  for (const [teks, isi, minimal] of PASANGAN) {
    test(`${teks} di atas ${isi} ≥ ${minimal}:1`, () => {
      expect(rasioKontras(W[teks] as string, W[isi] as string)).toBeGreaterThanOrEqual(minimal);
    });
  }
});

describe("aksen mode kerja", () => {
  test("empat mode lengkap: harian, mingguan, tempoan, semua", () => {
    expect(Object.keys(AKSEN_MODE).sort()).toEqual(["harian", "mingguan", "semua", "tempoan"]);
  });

  for (const [nama, a] of Object.entries(AKSEN_MODE)) {
    test(`${nama}: teks terbaca di latar, permukaan & latar lembut; teksIsi terbaca di isi`, () => {
      expect(rasioKontras(a.teks, WARNA.latar)).toBeGreaterThanOrEqual(4.5);
      expect(rasioKontras(a.teks, WARNA.permukaan)).toBeGreaterThanOrEqual(4.5);
      expect(rasioKontras(a.teks, WARNA.permukaanTinggi)).toBeGreaterThanOrEqual(4.5);
      expect(rasioKontras(a.teks, a.lembut)).toBeGreaterThanOrEqual(4.5);
      expect(rasioKontras(a.teksIsi, a.isi)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("kedalaman = kecerahan permukaan (tanpa bayangan)", () => {
  test("tangga naik: latar < permukaan < permukaanTinggi, tiap anak tangga terlihat", () => {
    expect(rasioKontras(WARNA.latar, WARNA.permukaan)).toBeGreaterThanOrEqual(1.08);
    expect(rasioKontras(WARNA.permukaan, WARNA.permukaanTinggi)).toBeGreaterThanOrEqual(1.15);
    expect(rasioKontras(WARNA.isiNetral, WARNA.isiNetralTegas)).toBeGreaterThanOrEqual(1.4);
  });

  test("garis kartu & pemisah terlihat: ≥ 1,4:1 di atas latar dan permukaan", () => {
    expect(rasioKontras(WARNA.garis, WARNA.latar)).toBeGreaterThanOrEqual(1.4);
    expect(rasioKontras(WARNA.garis, WARNA.permukaan)).toBeGreaterThanOrEqual(1.4);
  });

  test("batas isian & tombol (garisTegas) ≥ 3:1 di atas latar dan permukaan (batas komponen)", () => {
    expect(rasioKontras(WARNA.garisTegas, WARNA.latar)).toBeGreaterThanOrEqual(3);
    expect(rasioKontras(WARNA.garisTegas, WARNA.permukaan)).toBeGreaterThanOrEqual(3);
  });
});

describe("kelengkapan & aturan penamaan token", () => {
  test("setiap nilai warna sah (hex 6 digit atau rgba) — tak ada kunci kosong", () => {
    for (const [kunci, nilai] of Object.entries(WARNA)) {
      expect(nilai, kunci).toMatch(/^(#[0-9a-fA-F]{6}|rgba\([\d\s.,]+\))$/);
    }
  });

  test("nama token menyebut peran, bukan warna (putih, hitam, abu, merah, hijau, biru, kuning)", () => {
    for (const kunci of Object.keys(WARNA)) {
      expect(kunci, `token "${kunci}" bernama warna`).not.toMatch(
        /^(putih|hitam|abu|abuTua|merah|hijau|biru|kuning)$/i,
      );
    }
  });
});
