import { describe, expect, test } from "bun:test";
import { daftarBulan } from "./bulan";

describe("daftarBulan", () => {
  test("Bulan Ini s/d hari ini, lalu lima bulan penuh (lintas tahun)", () => {
    const d = daftarBulan("2026-02-10");
    expect(d.map((b) => b.pil)).toEqual([
      "Bulan Ini",
      "Januari 2026",
      "Desember 2025",
      "November 2025",
      "Oktober 2025",
      "September 2025",
    ]);
    expect(d[0]).toMatchObject({ mulai: "2026-02-01", selesai: "2026-02-10", bulanIni: true });
    expect(d[1]).toMatchObject({ mulai: "2026-01-01", selesai: "2026-01-31", bulanIni: false });
  });
});
