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
const LATAR = ["latar", "permukaan", "abu"] as const;

/** Setiap teks `teks` harus terbaca di atas SEMUA latar `di`, minimal `minimal`:1. */
function periksaTeks(teks: readonly string[], di: readonly string[], minimal: number) {
  for (const t of teks) {
    for (const l of di) {
      const r = rasioKontras(W[t] as string, W[l] as string);
      expect(r, `${t} di atas ${l} = ${r.toFixed(1)}:1`).toBeGreaterThanOrEqual(minimal);
    }
  }
}

describe("kontras teks di atas latar & permukaan", () => {
  test("teks penting (teks, teksTombol, teksLabel, teksKedua) ≥ 7:1", () => {
    periksaTeks(["teks", "teksTombol", "teksLabel", "teksKedua"], LATAR, 7);
  });

  test("teks pendukung (redup) ≥ 4,5:1", () => {
    periksaTeks(["redup"], LATAR, 4.5);
  });

  test("teks samar (placeholder, penanda) ≥ 3:1 — bukan untuk data yang harus dibaca", () => {
    periksaTeks(["samar"], LATAR, 3);
  });

  test("teks beraksen (hijau, merah, kuning) ≥ 4,5:1", () => {
    periksaTeks(
      ["utama", "utamaTua", "bahayaTeks", "bahayaTua", "waspada", "waspadaTua"],
      LATAR,
      4.5,
    );
  });
});

describe("kontras teks di atas isi berwarna", () => {
  const PASANGAN: [teks: string, isi: string, minimal: number][] = [
    ["teksAtasUtama", "utamaIsi", 4.5],
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

  /**
   * KEKURANGAN YANG SUDAH ADA sebelum tema dipusatkan (16 Nov 2026): teks putih di atas
   * lencana merah pekat tak mencapai 4,5:1. Batas di bawah hanya mengunci agar TIDAK
   * MEMBURUK; Tahap 3 (desain ulang tema) menaikkannya ke 4,5.
   */
  test("teksAtasBahaya di atas bahaya & bahayaBingkai tidak lebih buruk dari sekarang", () => {
    expect(rasioKontras(WARNA.teksAtasBahaya, WARNA.bahaya)).toBeGreaterThanOrEqual(2.5);
    expect(rasioKontras(WARNA.teksAtasBahaya, WARNA.bahayaBingkai)).toBeGreaterThanOrEqual(3.5);
  });
});

describe("aksen mode kerja", () => {
  test("empat mode lengkap: harian, mingguan, tempoan, semua", () => {
    expect(Object.keys(AKSEN_MODE).sort()).toEqual(["harian", "mingguan", "semua", "tempoan"]);
  });

  for (const [nama, a] of Object.entries(AKSEN_MODE)) {
    test(`${nama}: teks terbaca di latar, permukaan & latar lembut; teksIsi terbaca di isi`, () => {
      expect(rasioKontras(a.teks, WARNA.latar)).toBeGreaterThanOrEqual(4.5);
      expect(rasioKontras(a.teks, WARNA.permukaan)).toBeGreaterThanOrEqual(4.5);
      expect(rasioKontras(a.teks, a.lembut)).toBeGreaterThanOrEqual(4.5);
      expect(rasioKontras(a.teksIsi, a.isi)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("kelengkapan & aturan penamaan token", () => {
  test("setiap nilai warna sah (hex 6 digit atau rgba) — tak ada kunci kosong", () => {
    for (const [kunci, nilai] of Object.entries(WARNA)) {
      expect(nilai, kunci).toMatch(/^(#[0-9a-fA-F]{6}|rgba\([\d\s.,]+\))$/);
    }
  });

  test("nama token menyebut peran, bukan warna (putih, hitam, merah, hijau, biru, kuning)", () => {
    for (const kunci of Object.keys(WARNA)) {
      expect(kunci, `token "${kunci}" bernama warna`).not.toMatch(
        /^(putih|hitam|merah|hijau|biru|kuning)$/i,
      );
    }
  });

  test("garis (pembatas) terlihat di atas latar & permukaan: garisTegas lebih tegas dari garis", () => {
    expect(rasioKontras(WARNA.garisTegas, WARNA.permukaan)).toBeGreaterThan(
      rasioKontras(WARNA.garis, WARNA.permukaan),
    );
    expect(rasioKontras(WARNA.garis, WARNA.latar)).toBeGreaterThan(1.2);
  });
});
