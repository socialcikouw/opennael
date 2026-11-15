import { describe, expect, test } from "bun:test";
import {
  fotoTerbaru,
  hutangNasabah,
  nomorWhatsApp,
  pinjamanAktif,
  saldoAktif,
  tautanPeta,
  tautanTelepon,
  tautanWhatsApp,
  tautanWhatsAppWeb,
  teksAkad,
  urutPinjaman,
} from "./nasabah";

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

describe("nomorWhatsApp & tautan WhatsApp", () => {
  test("E.164, awalan 0, dan tanda baca menjadi satu bentuk: kode negara + angka", () => {
    expect(nomorWhatsApp("+6281234567890")).toBe("6281234567890");
    expect(nomorWhatsApp("0812-3456 7890")).toBe("6281234567890");
    expect(nomorWhatsApp("+62 812 3456 7890")).toBe("6281234567890");
  });

  test("nomor yang tak masuk akal ditolak (terlalu pendek / terlalu panjang / kosong)", () => {
    expect(nomorWhatsApp("")).toBeNull();
    expect(nomorWhatsApp("0812")).toBeNull();
    expect(nomorWhatsApp("+62812345678901234")).toBeNull();
  });

  test("tautan langsung ke aplikasi dan cadangan web", () => {
    expect(tautanWhatsApp("6281234567890")).toBe("whatsapp://send?phone=6281234567890");
    expect(tautanWhatsAppWeb("6281234567890")).toBe("https://wa.me/6281234567890");
  });
});

describe("saldoAktif", () => {
  test("menjumlah saldo pinjaman berjalan dan macet saja", () => {
    expect(
      saldoAktif([
        { status: "berjalan", saldo: 700_000 },
        { status: "macet", saldo: 300_000 },
        { status: "lunas", saldo: 0 },
        { status: "diputihkan", saldo: 500_000 },
      ]),
    ).toBe(1_000_000);
  });

  test("tanpa pinjaman aktif = 0", () => {
    expect(saldoAktif([])).toBe(0);
    expect(saldoAktif([{ status: "digulung", saldo: 100_000 }])).toBe(0);
  });
});

describe("hutangNasabah", () => {
  test("hutang = sisa saldo − tabungan", () => {
    expect(hutangNasabah(1_000_000, 50_000)).toBe(950_000);
    expect(hutangNasabah(1_000_000, 0)).toBe(1_000_000);
  });

  test("tabungan melebihi atau sama dengan saldo → 0, tak pernah minus", () => {
    expect(hutangNasabah(100_000, 100_000)).toBe(0);
    expect(hutangNasabah(100_000, 250_000)).toBe(0);
    expect(hutangNasabah(0, 50_000)).toBe(0);
  });
});

describe("teksAkad", () => {
  test("tanggal bertahun dua digit + jam dinding kantor (WIB = UTC+7)", () => {
    expect(teksAkad("2026-10-27", "2026-10-27T07:00:00.000Z", "WIB")).toBe("Akad: 27 Okt 26 14.00");
  });

  test("zona kantor menggeser jam (WITA = UTC+8)", () => {
    expect(teksAkad("2026-10-27", "2026-10-27T07:05:00.000Z", "WITA")).toBe(
      "Akad: 27 Okt 26 15.05",
    );
  });

  test("salinan buku lama tanpa jam akad: hanya tanggal", () => {
    expect(teksAkad("2026-09-03", null, "WIB")).toBe("Akad: 3 Sep 26");
  });
});
