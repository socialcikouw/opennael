import { describe, expect, test } from "bun:test";
import { isiNasabahAkad } from "./isi-akad";

const KOSONG = { lamaId: null, nama: "", kampung: null, nik: "", nomorHp: "" };

describe("isiNasabahAkad", () => {
  test("pernah melunasi: hanya id nasabah", () => {
    expect(isiNasabahAkad({ ...KOSONG, siapa: "pernah-melunasi", lamaId: "n-1" })).toEqual({
      nasabahId: "n-1",
    });
    expect(isiNasabahAkad({ ...KOSONG, siapa: "pernah-melunasi" })).toBeNull();
  });

  test("nasabah baru, kampung dari daftar kantor, tanpa NIK & HP", () => {
    expect(
      isiNasabahAkad({
        ...KOSONG,
        siapa: "baru",
        nama: "  siti aminah ",
        kampung: { nama: "pule", id: "w-1" },
      }),
    ).toEqual({ nama: "siti aminah", kampung: { wilayahId: "w-1" } });
  });

  test("nasabah baru, kampung baru diketik, NIK & HP diisi", () => {
    expect(
      isiNasabahAkad({
        siapa: "baru",
        lamaId: null,
        nama: "ujang",
        kampung: { nama: " cibeber hilir ", id: null },
        nik: "3201234567890001",
        nomorHp: "081234567890",
      }),
    ).toEqual({
      nama: "ujang",
      kampung: { nama: "cibeber hilir" },
      nik: "3201234567890001",
      nomorHp: "081234567890",
    });
  });

  test("belum lengkap: tanpa nama, tanpa kampung, atau siapa belum dipilih", () => {
    const kp = { nama: "pule", id: "w-1" };
    expect(isiNasabahAkad({ ...KOSONG, siapa: "baru", kampung: kp })).toBeNull();
    expect(isiNasabahAkad({ ...KOSONG, siapa: "baru", nama: "ujang" })).toBeNull();
    expect(isiNasabahAkad({ ...KOSONG, siapa: null, nama: "ujang", kampung: kp })).toBeNull();
  });
});
