import { describe, expect, test } from "bun:test";
import { hitungPerforma } from "./performa";

describe("performa penagihan harian (aturan-usaha N)", () => {
  test("contoh N: patokan 2.000.000 − 100.000, murni 1.710.000 → 90%", () => {
    expect(hitungPerforma(1_710_000, 2_000_000, 100_000)).toEqual({
      patokan: 1_900_000,
      persentase: 90,
    });
  });

  test("N2: tanpa potret kemarin kosong; patokan ≤ 0 tanpa persentase", () => {
    expect(hitungPerforma(500_000, null, 0)).toEqual({ patokan: null, persentase: null });
    expect(hitungPerforma(500_000, 100_000, 100_000)).toEqual({ patokan: 0, persentase: null });
  });
});

// ---- N3 / N4 ---------------------------------------------------------------------------

import {
  type BahanPatokan,
  gabungPerforma,
  jatuhTagihPada,
  type PerpindahanStatus,
  patokanJatuhTagih,
  persentasePerforma,
  statusPada,
} from "./performa";

const lahir = (tanggal: string): PerpindahanStatus[] => [{ tanggal, sesudah: "berjalan" }];

const mingguan = (isi: Partial<BahanPatokan> = {}): BahanPatokan => ({
  jenis: "mingguan",
  angsuran: 100_000,
  tanggalAkad: "2026-10-14", // Rabu
  tenor: 8,
  jatuhTempo: null,
  status: "berjalan",
  tanggalSelesai: null,
  riwayat: lahir("2026-10-14"),
  ...isi,
});

describe("statusPada", () => {
  const riwayat: PerpindahanStatus[] = [
    { tanggal: "2026-10-01", sesudah: "berjalan" },
    { tanggal: "2026-10-12", sesudah: "macet" },
    { tanggal: "2026-10-15", sesudah: "berjalan" },
  ];
  test("perpindahan terakhir dengan tanggal ≤ hari itu", () => {
    expect(statusPada(riwayat, "2026-10-11")).toBe("berjalan");
    expect(statusPada(riwayat, "2026-10-12")).toBe("macet");
    expect(statusPada(riwayat, "2026-10-14")).toBe("macet");
    expect(statusPada(riwayat, "2026-10-15")).toBe("berjalan");
  });
  test("sebelum lahir: null", () => {
    expect(statusPada(riwayat, "2026-09-30")).toBeNull();
    expect(statusPada([], "2026-10-01")).toBeNull();
  });
});

describe("jatuhTagihPada (N3)", () => {
  test("mingguan: akad + 7k, bukan hari akad, paling banyak tenor", () => {
    const b = mingguan({ tenor: 2 });
    expect(jatuhTagihPada(b, "2026-10-14")).toBe(false); // hari akad
    expect(jatuhTagihPada(b, "2026-10-21")).toBe(true); // k = 1
    expect(jatuhTagihPada(b, "2026-10-28")).toBe(true); // k = 2
    expect(jatuhTagihPada(b, "2026-11-04")).toBe(false); // k = 3 > tenor
    expect(jatuhTagihPada(b, "2026-10-22")).toBe(false); // hari lain
  });
  test("tempoan: hari jatuh tempo; tanpa jatuh tempo tersimpan = akad + tenor", () => {
    const t = mingguan({ jenis: "tempoan", tenor: 10, jatuhTempo: "2026-10-24" });
    expect(jatuhTagihPada(t, "2026-10-24")).toBe(true);
    expect(jatuhTagihPada(t, "2026-10-23")).toBe(false);
    const tanpa = mingguan({ jenis: "tempoan", tenor: 10, jatuhTempo: null });
    expect(jatuhTagihPada(tanpa, "2026-10-24")).toBe(true); // 14 Okt + 10
  });
});

describe("patokanJatuhTagih (N3)", () => {
  const RABU = "2026-10-21";

  test("contoh N3: A, B berjalan; C macet pekan lalu; D digulung hari itu → 275.000", () => {
    const daftar: BahanPatokan[] = [
      mingguan({ angsuran: 150_000 }),
      mingguan({ angsuran: 125_000 }),
      mingguan({
        angsuran: 100_000,
        status: "macet",
        riwayat: [...lahir("2026-10-14"), { tanggal: "2026-10-15", sesudah: "macet" }],
      }),
      mingguan({
        angsuran: 200_000,
        status: "digulung",
        tanggalSelesai: RABU,
        riwayat: [...lahir("2026-10-14"), { tanggal: RABU, sesudah: "digulung" }],
      }),
    ];
    const patokan = patokanJatuhTagih(daftar, RABU);
    expect(patokan).toBe(275_000);
    expect(persentasePerforma(220_000, patokan)).toBe(80);
  });

  test("lunas pada hari D tetap masuk (ia membayar)", () => {
    const b = mingguan({
      status: "lunas",
      tanggalSelesai: RABU,
      riwayat: [...lahir("2026-10-14"), { tanggal: RABU, sesudah: "lunas" }],
    });
    expect(patokanJatuhTagih([b], RABU)).toBe(100_000);
  });

  test("diputihkan hari D tidak masuk; macet yang pulih sebelum D masuk", () => {
    const putih = mingguan({
      status: "diputihkan",
      tanggalSelesai: RABU,
      riwayat: [
        ...lahir("2026-10-14"),
        { tanggal: "2026-10-15", sesudah: "macet" },
        { tanggal: RABU, sesudah: "diputihkan" },
      ],
    });
    const pulih = mingguan({
      riwayat: [
        ...lahir("2026-10-14"),
        { tanggal: "2026-10-15", sesudah: "macet" },
        { tanggal: "2026-10-20", sesudah: "berjalan" },
      ],
    });
    expect(patokanJatuhTagih([putih, pulih], RABU)).toBe(100_000);
  });

  test("pinjaman yang lahir hari D atau sesudahnya tak masuk; yang sudah selesai sebelum D juga", () => {
    const baruHariIni = mingguan({ tanggalAkad: RABU, riwayat: lahir(RABU) });
    const lunasLama = mingguan({
      status: "lunas",
      tanggalSelesai: "2026-10-18",
      riwayat: [...lahir("2026-10-14"), { tanggal: "2026-10-18", sesudah: "lunas" }],
    });
    expect(patokanJatuhTagih([baruHariIni, lunasLama], RABU)).toBe(0);
  });

  test("tempoan jatuh tempo hari D; macet kemarin tidak", () => {
    const berjalan = mingguan({ jenis: "tempoan", angsuran: 1_250_000, tenor: 7 });
    const macet = mingguan({
      jenis: "tempoan",
      angsuran: 900_000,
      tenor: 7,
      status: "macet",
      riwayat: [...lahir("2026-10-14"), { tanggal: "2026-10-20", sesudah: "macet" }],
    });
    expect(patokanJatuhTagih([berjalan, macet], RABU)).toBe(1_250_000);
  });

  test("tak ada yang jatuh tagih: patokan 0, persentase kosong (bukan nol)", () => {
    expect(patokanJatuhTagih([mingguan()], "2026-10-22")).toBe(0);
    expect(persentasePerforma(50_000, 0)).toBeNull();
  });
});

describe("gabungPerforma (N4)", () => {
  test("setoran dan patokan dijumlah; patokan kosong dihitung nol", () => {
    expect(
      gabungPerforma([
        { setoranMurni: 1_710_000, patokan: 1_900_000 },
        { setoranMurni: 220_000, patokan: 275_000 },
        { setoranMurni: 0, patokan: 0 },
      ]),
    ).toEqual({
      setoranMurni: 1_930_000,
      patokan: 2_175_000,
      persentase: (1_930_000 / 2_175_000) * 100,
    });
    expect(gabungPerforma([{ setoranMurni: 100_000, patokan: null }]).persentase).toBeNull();
  });
});
