import { describe, expect, test } from "bun:test";
import type { KartuTagih } from "@opennael/contracts";
import { rasioHariIni, rasioJenis } from "./rasio";

const T = "2026-11-01";

type Bahan = Pick<KartuTagih, "jenis" | "tanggalAkad" | "jatuhTempo" | "batasTempo" | "hariIni">;
const harian = (hariIni: Bahan["hariIni"] = null, tanggalAkad = "2026-10-20"): Bahan => ({
  jenis: "harian",
  tanggalAkad,
  jatuhTempo: null,
  batasTempo: null,
  hariIni,
});
const bayar = (storting: number): Bahan["hariIni"] => ({ jenis: "angsuran", storting });
const libur: Bahan["hariIni"] = { jenis: "libur", alasan: null };

describe("rasioHariIni", () => {
  test("tanpa pinjaman: semua nol, persen null", () => {
    expect(rasioHariIni([], T)).toEqual({ bayar: 0, libur: 0, sisa: 0, persen: null, setoran: 0 });
  });

  test("belum ada yang dicatat: persen null walau ada sisa wajib", () => {
    const r = rasioHariIni([harian(), harian()], T);
    expect(r).toEqual({ bayar: 0, libur: 0, sisa: 2, persen: null, setoran: 0 });
  });

  test("persen = bayar ÷ (bayar + libur), dibulatkan; sisa tak ikut membagi", () => {
    const r = rasioHariIni(
      [harian(bayar(50_000)), harian(bayar(50_000)), harian(libur), harian(), harian()],
      T,
    );
    expect(r).toMatchObject({ bayar: 2, libur: 1, sisa: 2, persen: 67 });
  });

  test("setoran menjumlah storting angsuran saja, libur tak menyumbang", () => {
    const r = rasioHariIni([harian(bayar(50_000)), harian(bayar(120_000)), harian(libur)], T);
    expect(r.setoran).toBe(170_000);
  });

  test("semua libur: persen 0, bukan null", () => {
    expect(rasioHariIni([harian(libur)], T).persen).toBe(0);
  });

  test("mingguan di luar hari tagih bukan sisa, tetapi bayar lebih awal tetap terhitung", () => {
    const r = rasioHariIni(
      [
        {
          jenis: "mingguan",
          tanggalAkad: "2026-10-26",
          jatuhTempo: null,
          batasTempo: null,
          hariIni: null,
        }, // hari tagihnya bukan hari ini
        {
          jenis: "mingguan",
          tanggalAkad: "2026-10-26",
          jatuhTempo: null,
          batasTempo: null,
          hariIni: bayar(100_000),
        },
        {
          jenis: "tempoan",
          tanggalAkad: "2026-10-20",
          jatuhTempo: null,
          batasTempo: null,
          hariIni: null,
        },
      ],
      T,
    );
    expect(r).toEqual({ bayar: 1, libur: 0, sisa: 0, persen: 100, setoran: 100_000 });
  });
});

describe("rasioJenis — tiap jenis memakai datanya sendiri", () => {
  const campur: Bahan[] = [
    {
      jenis: "harian",
      tanggalAkad: "2026-10-20",
      jatuhTempo: null,
      batasTempo: null,
      hariIni: bayar(50_000),
    },
    {
      jenis: "harian",
      tanggalAkad: "2026-10-20",
      jatuhTempo: null,
      batasTempo: null,
      hariIni: bayar(50_000),
    },
    {
      jenis: "harian",
      tanggalAkad: "2026-10-20",
      jatuhTempo: null,
      batasTempo: null,
      hariIni: libur,
    },
    {
      jenis: "mingguan",
      tanggalAkad: "2026-10-25",
      jatuhTempo: null,
      batasTempo: null,
      hariIni: null,
    }, // wajib hari ini, belum dicatat
    {
      jenis: "mingguan",
      tanggalAkad: "2026-10-25",
      jatuhTempo: null,
      batasTempo: null,
      hariIni: bayar(150_000),
    },
    {
      jenis: "tempoan",
      tanggalAkad: "2026-10-20",
      jatuhTempo: null,
      batasTempo: null,
      hariIni: bayar(1_250_000),
    },
  ];

  test("harian, mingguan, dan tempoan menghasilkan angka yang berbeda", () => {
    expect(rasioJenis(campur, T, "harian")).toEqual({
      bayar: 2,
      libur: 1,
      sisa: 0,
      persen: 67,
      setoran: 100_000,
    });
    expect(rasioJenis(campur, T, "mingguan")).toEqual({
      bayar: 1,
      libur: 0,
      sisa: 1,
      persen: 100,
      setoran: 150_000,
    });
    expect(rasioJenis(campur, T, "tempoan")).toEqual({
      bayar: 1,
      libur: 0,
      sisa: 0,
      persen: 100,
      setoran: 1_250_000,
    });
  });

  test("Semua = ketiga jenis bersama", () => {
    expect(rasioJenis(campur, T, null)).toEqual({
      bayar: 4,
      libur: 1,
      sisa: 1,
      persen: 80,
      setoran: 1_500_000,
    });
    expect(rasioJenis(campur, T, null)).toEqual(rasioHariIni(campur, T));
  });

  test("jenis yang tak punya pinjaman: semua nol", () => {
    expect(rasioJenis(campur.slice(0, 3), T, "tempoan")).toEqual({
      bayar: 0,
      libur: 0,
      sisa: 0,
      persen: null,
      setoran: 0,
    });
  });
});
