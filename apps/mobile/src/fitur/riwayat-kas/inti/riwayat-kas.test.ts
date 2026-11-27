import { describe, expect, test } from "bun:test";
import type { HariKas, RiwayatHari } from "@opennael/contracts";
import {
  barisHari,
  kartuArus,
  keadaanHari,
  ringkasBulan,
  sorotBulan,
  sorotHari,
} from "./riwayat-kas";

const T = "2026-11-28";

const hari = (ubah: Partial<RiwayatHari>): RiwayatHari => ({
  tanggal: "2026-11-27",
  absensi: "masuk_kerja",
  alasanTidakKerja: null,
  kasLapangan: 1_000_000,
  uangJalan: 50_000,
  laporanDibukaAt: "2026-11-27T09:00:00.000Z",
  tekorLama: 0,
  serahTerima: null,
  ...ubah,
});

const st = (diterima: number, seharusnya = 2_000_000) => {
  const selisih = diterima - seharusnya;
  return {
    tunaiSeharusnya: seharusnya,
    tunaiDiterima: diterima,
    selisihSetor: selisih,
    tekor: Math.max(0, -selisih),
    lebihSetor: Math.max(0, selisih),
  };
};

describe("keadaan & baris hari", () => {
  test("urut alur hari: tidak kerja, diterima, hari ini laporan/lapangan, lewat belum diterima", () => {
    expect(keadaanHari(hari({ absensi: "tidak_kerja" }), T)).toBe("tidak-kerja");
    expect(keadaanHari(hari({ serahTerima: st(2_000_000) }), T)).toBe("diterima");
    expect(keadaanHari(hari({ tanggal: T }), T)).toBe("laporan");
    expect(keadaanHari(hari({ tanggal: T, laporanDibukaAt: null }), T)).toBe("lapangan");
    expect(keadaanHari(hari({}), T)).toBe("belum-diterima");
  });

  test("catatan: tekor merah, lebih setor hijau, pas, alasan tidak kerja, tekor buku lama", () => {
    expect(barisHari(hari({ serahTerima: st(1_980_000) }), T)).toMatchObject({
      diterima: 1_980_000,
      catatan: "Tekor Rp 20.000",
      nada: "bahaya",
    });
    expect(barisHari(hari({ serahTerima: st(2_005_000) }), T)).toMatchObject({
      catatan: "Lebih setor Rp 5.000",
      nada: "sukses",
    });
    expect(barisHari(hari({ serahTerima: st(2_000_000) }), T).catatan).toBe("Pas");
    expect(barisHari(hari({ absensi: "tidak_kerja", alasanTidakKerja: "sakit" }), T).catatan).toBe(
      "sakit",
    );
    expect(barisHari(hari({ tekorLama: 15_000 }), T)).toMatchObject({
      catatan: "Tekor Rp 15.000 (buku lama)",
      nada: "bahaya",
    });
  });
});

describe("ringkasan bulan", () => {
  test("diterima, tekor (termasuk buku lama), lebih setor, hitungan hari", () => {
    const r = ringkasBulan([
      hari({ serahTerima: st(1_980_000) }),
      hari({ serahTerima: st(2_005_000) }),
      hari({ absensi: "tidak_kerja" }),
      hari({ tekorLama: 10_000 }),
    ]);
    expect(r).toEqual({
      diterima: 3_985_000,
      tekor: 30_000,
      lebihSetor: 5_000,
      hariDiterima: 2,
      hariTidakKerja: 1,
    });
    expect(sorotBulan(r)).toMatchObject({
      label: "Setoran ke Kasir",
      nilai: 3_985_000,
      lencana: "Ada Tekor",
      rumus: "2 hari diterima · 1 hari tidak kerja",
    });
  });
});

describe("satu hari", () => {
  const rincian = {
    kasLapangan: 1_000_000,
    storting: 1_250_000,
    tabunganMasuk: 50_000,
    potonganAdmin: 50_000,
    droping: 1_000_000,
    transfer: 70_000,
    biaya: 30_000,
    tunaiSeharusnya: 1_250_000,
  };
  const hk = (ubah: Partial<HariKas>): HariKas => ({
    id: "h",
    kolektor: { id: "k", nama: "rian" },
    tanggal: "2026-11-27",
    absensi: "masuk_kerja",
    alasanTidakKerja: null,
    kasLapangan: 1_000_000,
    uangJalan: 50_000,
    laporanDibukaAt: null,
    rincian,
    serahTerima: null,
    ...ubah,
  });

  test("arus kas I1: masuk positif, keluar negatif, contoh aturan-usaha I2", () => {
    const k = kartuArus(hk({}));
    expect(k?.nilai).toBe(1_250_000);
    expect(k?.rincian.map((r) => r.nilai)).toEqual([
      1_000_000, 1_250_000, 50_000, 50_000, -1_000_000, -70_000, -30_000,
    ]);
    expect(kartuArus(hk({ rincian: null }))).toBeNull();
  });

  test("kartu hitam: angka beku saat diterima, tekor", () => {
    const s = sorotHari(
      hk({
        serahTerima: {
          id: "s",
          tunaiSeharusnya: 1_250_000,
          tunaiDiterima: 1_200_000,
          selisihSetor: -50_000,
          tekor: 50_000,
          lebihSetor: 0,
          diterimaOleh: { id: "x", nama: "sari" },
          dibuatAt: "2026-11-27T10:00:00.000Z",
        },
      }),
    );
    expect(s).toMatchObject({
      nilai: 1_250_000,
      lencana: "Tekor",
      rumus: "Dibekukan saat diterima sari",
      keping: [
        { label: "Diterima kasir", nilai: 1_200_000 },
        { label: "Tekor", nilai: 50_000 },
      ],
    });
    expect(sorotHari(hk({})).lencana).toBe("Belum Diterima");
  });
});
