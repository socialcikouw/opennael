import { describe, expect, test } from "bun:test";
import type { PratinjauGaji } from "@opennael/contracts";
import {
  barisHarian,
  mulaiGajiBerjalan,
  ringkasSlip,
  type Slip,
  sorotGajiBerjalan,
  teksPeriode,
} from "./gaji";

const slip = (ubah: Partial<Slip>): Slip => ({
  id: "s",
  periodeMulai: "2026-11-01",
  periodeSelesai: "2026-11-15",
  gajiKotor: 600_000,
  potonganTekor: 50_000,
  gajiBersih: 550_000,
  dariAkun: "tunai",
  tanggalBayar: "2026-11-16",
  keterangan: null,
  dibatalkanAt: null,
  alasanBatal: null,
  ...ubah,
});

const pratinjau = (ubah: Partial<PratinjauGaji> = {}): PratinjauGaji => ({
  kolektor: { id: "k1", nama: "rian" },
  periodeMulai: "2026-11-16",
  periodeSelesai: "2026-11-28",
  hari: [
    { tanggal: "2026-11-17", storting: 4_000_000, tarifBp: 500, tekor: 0 },
    { tanggal: "2026-11-18", storting: 2_000_000, tarifBp: 500, tekor: 20_000 },
    { tanggal: "2026-11-19", storting: -100_000, tarifBp: 500, tekor: 0 },
  ],
  gajiKotor: 295_000,
  potonganTekor: 20_000,
  gajiBersih: 275_000,
  halangan: "PERIODE_BELUM_BERAKHIR",
  ...ubah,
});

describe("gaji berjalan", () => {
  test("mulai sehari sesudah slip berlaku terakhir; slip batal diabaikan", () => {
    const daftar = [
      slip({ periodeMulai: "2026-10-16", periodeSelesai: "2026-10-31" }),
      slip({}),
      slip({ periodeMulai: "2026-11-16", periodeSelesai: "2026-11-20", dibatalkanAt: "x" }),
    ];
    expect(mulaiGajiBerjalan(daftar, "2026-11-28")).toBe("2026-11-16");
  });

  test("belum pernah dibayar → awal bulan ini", () => {
    expect(mulaiGajiBerjalan([], "2026-11-28")).toBe("2026-11-01");
  });

  test("kartu hitam: perkiraan, rentang & rumus tarif", () => {
    expect(sorotGajiBerjalan(pratinjau(), "2026-11-16", "2026-11-28")).toMatchObject({
      label: "Gaji Belum Dibayar",
      nilai: 275_000,
      lencana: "Perkiraan",
      rumus: "16 Nov – 28 Nov 2026 · 5% storting − tekor",
      keping: [
        { label: "Gaji kotor", nilai: 295_000 },
        { label: "Tekor", nilai: 20_000 },
      ],
    });
    expect(
      sorotGajiBerjalan(pratinjau({ gajiBersih: -5 }), "2026-11-28", "2026-11-28"),
    ).toMatchObject({ lencana: "Minus", rumus: "Hari ini · 5% storting − tekor" });
  });

  test("rincian per hari: terbaru dulu, storting negatif & tekor merah", () => {
    expect(barisHarian(pratinjau()).map((b) => [b.label, b.nilai, b.nada])).toEqual([
      ["19 Nov · 5% dari storting", -5_000, "bahaya"],
      ["18 Nov · 5% dari storting", 100_000, undefined],
      ["18 Nov · tekor", -20_000, "bahaya"],
      ["17 Nov · 5% dari storting", 200_000, undefined],
    ]);
  });
});

describe("riwayat slip", () => {
  test("dibayar tahun ini hanya slip berlaku; urut terbaru dulu", () => {
    const r = ringkasSlip(
      [
        slip({ id: "a", periodeMulai: "2026-10-16", tanggalBayar: "2026-11-01" }),
        slip({ id: "b" }),
        slip({
          id: "c",
          periodeMulai: "2026-11-01",
          dibatalkanAt: "x",
          tanggalBayar: "2026-11-16",
        }),
        slip({ id: "d", periodeMulai: "2025-12-16", tanggalBayar: "2025-12-31" }),
      ],
      "2026",
    );
    expect(r.dibayarTahunIni).toBe(1_100_000);
    expect(r.jumlahTahunIni).toBe(2);
    expect(r.urut.map((s) => s.id)).toEqual(["b", "c", "a", "d"]);
  });

  test("teks periode", () => {
    expect(teksPeriode("2026-11-01", "2026-11-15")).toBe("1–15 Nov 2026");
    expect(teksPeriode("2026-10-28", "2026-11-03")).toBe("28 Okt – 3 Nov 2026");
    expect(teksPeriode("2025-12-30", "2026-01-05")).toBe("30 Des 2025 – 5 Jan 2026");
  });
});
