import { describe, expect, test } from "bun:test";
import {
  pilihanSah,
  saringAktivitas,
  saringGaji,
  saringHarian,
  saringKaryawan,
  saringKas,
  saringNasabah,
  saringPengaturan,
  saringPinjaman,
  saringTanggal,
  tanggalSah,
  teksSah,
} from "./pencarian";

/** Hasil seperti yang sampai ke layar: kunci bernilai `undefined` tak ikut (tak masuk URL). */
const bersih = (x: object) =>
  Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined));

describe("nilai tunggal", () => {
  test("tanggalSah: hanya YYYY-MM-DD", () => {
    expect(tanggalSah.parse("2026-11-01")).toBe("2026-11-01");
    for (const salah of [
      "",
      "2026-1-01",
      "2026-11-01x",
      "x2026-11-01",
      20261101,
      true,
      null,
      [],
      {},
    ]) {
      expect(tanggalSah.parse(salah)).toBeUndefined();
    }
    expect(tanggalSah.parse(undefined)).toBeUndefined();
  });

  test("teksSah: teks tak kosong", () => {
    expect(teksSah.parse("ani")).toBe("ani");
    expect(teksSah.parse(" ")).toBe(" ");
    for (const salah of ["", 5, true, null, [], ["a"], {}])
      expect(teksSah.parse(salah)).toBeUndefined();
  });

  test("pilihanSah: persis salah satu dari daftar", () => {
    const tab = pilihanSah(["a", "b"]);
    expect(tab.parse("a")).toBe("a");
    for (const salah of ["A", "c", "", 1, null, ["a"]]) expect(tab.parse(salah)).toBeUndefined();
  });
});

describe("skema pencarian rute", () => {
  test("tanpa parameter sama sekali: semua rute sah dan kosong", () => {
    for (const skema of [
      saringTanggal,
      saringAktivitas,
      saringGaji,
      saringHarian,
      saringKaryawan,
      saringKas,
      saringNasabah,
      saringPengaturan,
      saringPinjaman,
    ]) {
      expect(bersih(skema.parse({}))).toEqual({});
    }
  });

  test("nilai sah lolos, kunci asing terbuang", () => {
    expect(bersih(saringAktivitas.parse({ tanggal: "2026-11-01", pelaku: "u1", zzz: 1 }))).toEqual({
      tanggal: "2026-11-01",
      pelaku: "u1",
    });
    expect(
      bersih(saringGaji.parse({ kolektor: "k1", mulai: "2026-11-01", selesai: "2026-11-07" })),
    ).toEqual({
      kolektor: "k1",
      mulai: "2026-11-01",
      selesai: "2026-11-07",
    });
    expect(bersih(saringHarian.parse({ tanggal: "2026-11-01", tab: "biaya" }))).toEqual({
      tanggal: "2026-11-01",
      tab: "biaya",
    });
    expect(bersih(saringKaryawan.parse({ peran: "kolektor", nonaktif: "ya" }))).toEqual({
      peran: "kolektor",
      nonaktif: "ya",
    });
    expect(
      bersih(saringKas.parse({ mulai: "2026-11-01", selesai: "2026-11-07", tab: "cocok" })),
    ).toEqual({
      mulai: "2026-11-01",
      selesai: "2026-11-07",
      tab: "cocok",
    });
    expect(bersih(saringNasabah.parse({ cari: "ani", kolektor: "k1", pilih: "n1" }))).toEqual({
      cari: "ani",
      kolektor: "k1",
      pilih: "n1",
    });
    expect(bersih(saringPengaturan.parse({ tab: "kampung" }))).toEqual({ tab: "kampung" });
    expect(
      bersih(saringPinjaman.parse({ kolektor: "k1", status: "semua", tunggak: "ya", pilih: "p1" })),
    ).toEqual({ kolektor: "k1", status: "semua", tunggak: "ya", pilih: "p1" });
  });

  test("nilai tak sah diabaikan per kunci, bukan galat — kunci sah di sebelahnya tetap", () => {
    expect(bersih(saringHarian.parse({ tanggal: "kemarin", tab: "setoran" }))).toEqual({
      tab: "setoran",
    });
    expect(bersih(saringKaryawan.parse({ peran: "admin", nonaktif: "ya" }))).toEqual({
      nonaktif: "ya",
    });
    expect(bersih(saringKaryawan.parse({ peran: "kolektor", nonaktif: true }))).toEqual({
      peran: "kolektor",
    });
    expect(bersih(saringKas.parse({ mulai: 20261101, tab: "kantor" }))).toEqual({});
    expect(bersih(saringPengaturan.parse({ tab: "kantor" }))).toEqual({}); // "kantor" = tab bawaan
    expect(
      bersih(saringPinjaman.parse({ status: "aktif", tunggak: "tidak", kolektor: "" })),
    ).toEqual({});
    expect(bersih(saringNasabah.parse({ cari: 5, kolektor: ["k1"], pilih: "n1" }))).toEqual({
      pilih: "n1",
    });
  });

  test("jalur validasi router (~standard.validate) tak pernah menghasilkan galat, apa pun isinya", () => {
    const semua = [
      saringTanggal,
      saringAktivitas,
      saringGaji,
      saringHarian,
      saringKaryawan,
      saringKas,
      saringNasabah,
      saringPengaturan,
      saringPinjaman,
    ];
    const sampah = {
      tanggal: 5,
      pelaku: [],
      kolektor: {},
      mulai: null,
      tab: 1,
      peran: true,
      status: "x",
    };
    for (const skema of semua) {
      for (const masukan of [{}, sampah]) {
        const hasil = skema["~standard"].validate(masukan);
        expect("issues" in hasil && hasil.issues).toBeFalsy();
      }
    }
  });
});
