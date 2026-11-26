import { describe, expect, test } from "bun:test";
import { daftarPeriode } from "./periode";

describe("daftarPeriode", () => {
  // Jumat 27 Nov 2026.
  const daftar = daftarPeriode("2026-11-27");
  const cari = (kunci: string) => daftar.find((p) => p.kunci === kunci);

  test("urutan pil: Hari Ini · Pekan Ini · Bulan Ini · lima bulan lalu", () => {
    expect(daftar.map((p) => p.pil)).toEqual([
      "Hari Ini",
      "Pekan Ini",
      "Bulan Ini",
      "Oktober 2026",
      "September 2026",
      "Agustus 2026",
      "Juli 2026",
      "Juni 2026",
    ]);
  });

  test("hari ini: satu hari, tanpa pembanding, Mutasi Kas berlaku", () => {
    expect(cari("hari-ini")).toMatchObject({
      rentang: { mulai: "2026-11-27", selesai: "2026-11-27" },
      pembanding: null,
      hariIni: true,
      judul: "Jumat, 27 Nov 2026",
    });
  });

  test("pekan ini: Senin s/d hari ini, dibanding hari yang sama pekan lalu", () => {
    expect(cari("pekan-ini")).toMatchObject({
      rentang: { mulai: "2026-11-23", selesai: "2026-11-27" },
      pembanding: { rentang: { mulai: "2026-11-16", selesai: "2026-11-20" }, label: "pekan lalu" },
      hariIni: false,
    });
    // Minggu = ujung pekan: Senin 23 s/d Minggu 29.
    const minggu = daftarPeriode("2026-11-29").find((p) => p.kunci === "pekan-ini");
    expect(minggu?.rentang).toEqual({ mulai: "2026-11-23", selesai: "2026-11-29" });
  });

  test("bulan ini dibanding tanggal sepadan bulan lalu, bukan bulan lalu penuh", () => {
    expect(cari("bulan-ini")).toMatchObject({
      judul: "November 2026 · s/d 27",
      rentang: { mulai: "2026-11-01", selesai: "2026-11-27" },
      pembanding: {
        rentang: { mulai: "2026-10-01", selesai: "2026-10-27" },
        label: "Oktober 1–27",
      },
    });
    // 31 Maret → Februari hanya sampai 28.
    const maret = daftarPeriode("2026-03-31").find((p) => p.kunci === "bulan-ini");
    expect(maret?.pembanding?.rentang).toEqual({ mulai: "2026-02-01", selesai: "2026-02-28" });
  });

  test("bulan lalu: penuh, dibanding bulan sebelumnya penuh; lintas tahun", () => {
    expect(cari("2026-10")).toMatchObject({
      rentang: { mulai: "2026-10-01", selesai: "2026-10-31" },
      pembanding: { rentang: { mulai: "2026-09-01", selesai: "2026-09-30" }, label: "September" },
    });
    const januari = daftarPeriode("2026-01-05");
    expect(januari[3]).toMatchObject({
      kunci: "2025-12",
      pil: "Desember 2025",
      pembanding: { label: "November" },
    });
  });
});
