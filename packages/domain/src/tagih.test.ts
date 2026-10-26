import { describe, expect, test } from "bun:test";
import { type BahanTagih, posisiTagih, wajibDitagihHariIni } from "./tagih";

const harian: BahanTagih = {
  jenis: "harian",
  tenor: 24,
  angsuran: 50_000,
  totalKembali: 1_200_000,
  saldoAwal: 1_200_000,
  saldo: 1_050_000,
  tanggalAkad: "2026-06-01",
  tanggalDisalin: null,
  jatuhTempo: null,
  hariTagihLewat: 5,
  liburLewat: 0,
};

describe("posisi tagih (aturan-usaha B5)", () => {
  test("contoh B5: 5 hari tagih s/d kemarin, terbayar 3 → tertinggal 2, tunggakan 100.000", () => {
    expect(posisiTagih(harian, "2026-06-08")).toEqual({ tertinggal: 2, tunggakan: 100_000 });
  });

  test("harian: libur nasabah mengurangi jadwal; lebih bayar tidak membuat minus", () => {
    expect(posisiTagih({ ...harian, liburLewat: 2 }, "2026-06-08")).toEqual({
      tertinggal: 0,
      tunggakan: 0,
    });
    expect(posisiTagih({ ...harian, saldo: 900_000 }, "2026-06-08").tertinggal).toBe(0);
  });

  test("harian: jadwal paling banyak tenor, tunggakan paling banyak sisa saldo", () => {
    const lewatTenor = { ...harian, hariTagihLewat: 40, saldo: 120_000 };
    // terbayar 21, jadwal dibatasi 24 → tertinggal 3, tapi saldo tinggal 120.000.
    expect(posisiTagih(lewatTenor, "2026-08-01")).toEqual({ tertinggal: 3, tunggakan: 120_000 });
  });

  test("harian migrasi: angsuran terbayar sebelum disalin ikut jadwal", () => {
    // Disalin dengan saldo 600.000 (12 angsuran sudah lunas di buku lama),
    // lalu 2 hari tagih lewat tanpa setoran → tertinggal 2.
    const migrasi = {
      ...harian,
      saldoAwal: 600_000,
      saldo: 600_000,
      tanggalDisalin: "2026-06-01",
      hariTagihLewat: 2,
    };
    expect(posisiTagih(migrasi, "2026-06-03")).toEqual({ tertinggal: 2, tunggakan: 100_000 });
  });

  const mingguan: BahanTagih = {
    ...harian,
    jenis: "mingguan",
    tenor: 10,
    angsuran: 120_000,
    saldo: 1_200_000,
    hariTagihLewat: 0,
  };

  test("mingguan: jadwal hari ini belum lewat; libur menggeser satu minggu", () => {
    // Akad 1 Jun: jadwal 8, 15, 22 Jun. Hari ini 22 Jun → yang lewat 8 & 15.
    expect(posisiTagih(mingguan, "2026-06-22")).toEqual({ tertinggal: 2, tunggakan: 240_000 });
    expect(posisiTagih(mingguan, "2026-06-23").tertinggal).toBe(3);
    expect(posisiTagih({ ...mingguan, liburLewat: 1 }, "2026-06-22").tertinggal).toBe(1);
    // Sebelum jadwal pertama lewat.
    expect(posisiTagih(mingguan, "2026-06-08").tertinggal).toBe(0);
  });

  test("tempoan: lewat jatuh tempo = seluruh saldo; hari jatuh tempo belum lewat", () => {
    const tempoan = {
      ...harian,
      jenis: "tempoan" as const,
      tenor: 14,
      totalKembali: 1_250_000,
      saldoAwal: 1_250_000,
      saldo: 1_250_000,
      angsuran: 1_250_000,
      jatuhTempo: "2026-06-15",
    };
    expect(posisiTagih(tempoan, "2026-06-15")).toEqual({ tertinggal: 0, tunggakan: 0 });
    expect(posisiTagih(tempoan, "2026-06-16")).toEqual({ tertinggal: 1, tunggakan: 1_250_000 });
  });
});

describe("wajib ditagih hari ini (aturan-usaha B6)", () => {
  // Kamis 29 Okt 2026.
  const kamis = "2026-10-29";

  test("contoh C6: hanya harian yang sudah mulai ditagih", () => {
    expect(wajibDitagihHariIni({ jenis: "harian", tanggalAkad: "2026-10-20" }, kamis)).toBe(true);
    // Mingguan akad Senin 26 — hari ini Kamis: bukan hari tagihnya.
    expect(wajibDitagihHariIni({ jenis: "mingguan", tanggalAkad: "2026-10-26" }, kamis)).toBe(
      false,
    );
    expect(wajibDitagihHariIni({ jenis: "tempoan", tanggalAkad: "2026-10-01" }, kamis)).toBe(false);
    // Akad hari ini belum ditagih (B1).
    expect(wajibDitagihHariIni({ jenis: "harian", tanggalAkad: kamis }, kamis)).toBe(false);
  });

  test("mingguan wajib tepat pada akad + 7k hari", () => {
    expect(wajibDitagihHariIni({ jenis: "mingguan", tanggalAkad: "2026-10-22" }, kamis)).toBe(true);
    expect(wajibDitagihHariIni({ jenis: "mingguan", tanggalAkad: "2026-10-08" }, kamis)).toBe(true);
    expect(wajibDitagihHariIni({ jenis: "mingguan", tanggalAkad: "2026-10-23" }, kamis)).toBe(
      false,
    );
  });
});
