import { describe, expect, test } from "bun:test";
import { jam, tanggal, tanggalBertahun, tanggalPendek, waktu, waktuPendek } from "./tanggal";

describe("format tanggal kantor", () => {
  test("tanggal: tiga bentuk nama hari", () => {
    expect(tanggal("2026-10-23")).toBe("Jum, 23 Okt 2026");
    expect(tanggal("2026-10-23", "pendek")).toBe("Jum, 23 Okt 2026");
    expect(tanggal("2026-10-23", "panjang")).toBe("Jumat, 23 Okt 2026");
    expect(tanggal("2026-10-23", "tanpa")).toBe("23 Okt 2026");
  });

  test("teks yang bukan tanggal dikembalikan apa adanya", () => {
    expect(tanggal("bukan-tanggal")).toBe("bukan-tanggal");
    expect(tanggalPendek("bukan-tanggal")).toBe("bukan-tanggal");
  });

  test("tanggalPendek & tanggalBertahun", () => {
    expect(tanggalPendek("2026-10-23")).toBe("23 Okt");
    expect(tanggalBertahun("2026-09-10")).toBe("10 Sep 26");
  });

  test("jam & waktu menurut zona kantor", () => {
    expect(jam("2026-10-23T07:05:00Z", "WIB")).toBe("14.05");
    expect(jam("2026-10-23T07:05:00Z", "WIT")).toBe("16.05");
    // Pemisah tanggal–jam bergantung ICU mesin (spasi atau koma).
    expect(waktu("2026-10-23T07:05:00Z", "WIB")).toMatch(/^23 Okt 2026,? 14.05$/);
  });

  test("waktuPendek memakai jam perangkat", () => {
    expect(waktuPendek(new Date(2026, 9, 26, 4, 55))).toBe("26 Okt 04.55");
  });
});
