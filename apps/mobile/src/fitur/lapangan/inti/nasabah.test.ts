import { describe, expect, test } from "bun:test";
import { fotoTerbaru, pinjamanAktif, tautanPeta, tautanTelepon, urutPinjaman } from "./nasabah";

const p = (status: string, pinjamanKe: number, fotoSerahTerimaId: string | null = null) => ({
  status,
  pinjamanKe,
  fotoSerahTerimaId,
});

describe("urutPinjaman", () => {
  test("aktif (berjalan, macet) di atas, lalu selesai; tiap kelompok pinjamanKe menurun", () => {
    const hasil = urutPinjaman([
      p("lunas", 1),
      p("digulung", 3),
      p("berjalan", 4),
      p("lunas", 2),
      p("macet", 5),
    ]);
    expect(hasil.map((x) => `${x.status}:${x.pinjamanKe}`)).toEqual([
      "macet:5",
      "berjalan:4",
      "digulung:3",
      "lunas:2",
      "lunas:1",
    ]);
  });

  test("tak mengubah daftar asal", () => {
    const asal = [p("lunas", 1), p("berjalan", 2)];
    urutPinjaman(asal);
    expect(asal.map((x) => x.pinjamanKe)).toEqual([1, 2]);
  });
});

describe("pinjamanAktif", () => {
  test("hanya berjalan dan macet", () => {
    for (const s of ["berjalan", "macet"]) expect(pinjamanAktif({ status: s })).toBe(true);
    for (const s of ["lunas", "digulung", "batal", "diputihkan"]) {
      expect(pinjamanAktif({ status: s })).toBe(false);
    }
  });
});

describe("fotoTerbaru", () => {
  test("foto dari pinjaman terbaru yang punya foto", () => {
    expect(fotoTerbaru([p("lunas", 1, "f1"), p("berjalan", 3, "f3"), p("lunas", 2, "f2")])).toBe(
      "f3",
    );
  });

  test("pinjaman terbaru tanpa foto (salinan buku lama) → foto pinjaman sebelumnya", () => {
    expect(fotoTerbaru([p("lunas", 1, "f1"), p("berjalan", 2, null)])).toBe("f1");
  });

  test("pinjaman batal tak dihitung", () => {
    expect(fotoTerbaru([p("lunas", 1, "f1"), p("batal", 2, "f2")])).toBe("f1");
  });

  test("tanpa foto sama sekali → null", () => {
    expect(fotoTerbaru([p("berjalan", 1, null)])).toBeNull();
    expect(fotoTerbaru([])).toBeNull();
  });
});

describe("tautan", () => {
  test("peta memuat latitude,longitude", () => {
    expect(tautanPeta({ latitude: -6.2, longitude: 106.8166 })).toBe(
      "https://www.google.com/maps/search/?api=1&query=-6.2,106.8166",
    );
  });

  test("telepon membuang spasi dan tanda hubung, mempertahankan +", () => {
    expect(tautanTelepon("0812-3456 789")).toBe("tel:08123456789");
    expect(tautanTelepon("+62 812 3456")).toBe("tel:+628123456");
  });
});
