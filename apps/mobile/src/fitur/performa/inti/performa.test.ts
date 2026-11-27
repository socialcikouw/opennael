import { describe, expect, test } from "bun:test";
import { type BarisPerforma, susunPerforma } from "./performa";
import { LEGENDA_TINGKAT, tingkatDari } from "./tingkat";

const T = "2026-11-04"; // Rabu

const baris = (
  tanggal: string,
  setoranMurni: number,
  patokan: number | null,
  persentase: number | null,
): BarisPerforma => ({ tanggal, setoranMurni, patokan, persentase });

// 1 Nov 2026 = Minggu (bukan hari tagih); 2–4 Nov hari tagih.
const DERET = [
  baris("2026-11-01", 0, 2_000_000, 0),
  baris("2026-11-02", 1_800_000, 2_000_000, 90),
  baris("2026-11-03", 2_000_000, 2_000_000, 100),
  baris("2026-11-04", 600_000, 2_000_000, 30),
];
const TAGIH = ["2026-11-02", "2026-11-03", "2026-11-04"];

describe("susunPerforma", () => {
  test("hari bukan hari tagih (Minggu) tak masuk titik walau server memberi 0%", () => {
    const r = susunPerforma(DERET, TAGIH, T);
    expect(r.titik.map((t) => t.tanggal)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
  });

  test("hari ini ditandai dan angkanya dibawa", () => {
    const r = susunPerforma(DERET, TAGIH, T);
    expect(r.titik.map((t) => t.hariIni)).toEqual([false, false, true]);
    expect(r.hariIni).toEqual({ setoranMurni: 600_000, patokan: 2_000_000, persentase: 30 });
  });

  test("rata-rata hanya hari yang sudah lewat — hari ini belum selesai", () => {
    expect(susunPerforma(DERET, TAGIH, T).rataRata).toBe(95); // (90 + 100) / 2, bukan ikut 30
  });

  test("persentase null (belum ada potret) tak ikut rata-rata, tapi tetap titik", () => {
    const deret = [
      baris("2026-11-02", 0, null, null),
      baris("2026-11-03", 1_500_000, 2_000_000, 75),
      baris("2026-11-04", 0, 2_000_000, 0),
    ];
    const r = susunPerforma(deret, TAGIH, T);
    expect(r.titik[0]).toEqual({
      tanggal: "2026-11-02",
      setoranMurni: 0,
      persentase: null,
      hariIni: false,
    });
    expect(r.rataRata).toBe(75);
  });

  test("rata-rata dibulatkan dari nilai mentah", () => {
    const deret = [
      baris("2026-11-02", 0, 3, 33.3),
      baris("2026-11-03", 0, 3, 66.6),
      baris("2026-11-04", 0, 3, 10),
    ];
    expect(susunPerforma(deret, TAGIH, T).rataRata).toBe(50); // (33.3 + 66.6) / 2 = 49.95
  });

  test("hari ini bukan hari tagih: tak ada angka hari ini, hari-hari lalu tetap", () => {
    const r = susunPerforma(DERET, ["2026-11-02", "2026-11-03"], T);
    expect(r.hariIni).toBeNull();
    expect(r.titik.map((t) => t.tanggal)).toEqual(["2026-11-02", "2026-11-03"]);
    expect(r.rataRata).toBe(95);
  });

  test("tanggal sesudah hari ini diabaikan", () => {
    const deret = [...DERET, baris("2026-11-05", 0, 2_000_000, 0)];
    const r = susunPerforma(deret, [...TAGIH, "2026-11-05"], T);
    expect(r.titik.at(-1)?.tanggal).toBe("2026-11-04");
  });

  test("kalender belum dimuat: kosong, bukan semua hari dianggap hari tagih", () => {
    expect(susunPerforma(DERET, undefined, T)).toEqual({
      hariIni: null,
      titik: [],
      rataRata: null,
      rataMurni: null,
      hariDinilai: 0,
      sorotan: { terbaik: null, terendah: null, hariTarget: 0 },
    });
  });

  test("hari tanpa patokan (0) tak jadi batang, tetapi hari ini tetap membawa angkanya", () => {
    const deret = [
      baris("2026-11-02", 0, 0, null), // mingguan: tak ada yang jatuh tagih
      baris("2026-11-03", 300_000, 400_000, 75),
      baris("2026-11-04", 0, 0, null),
    ];
    const r = susunPerforma(deret, TAGIH, T);
    expect(r.titik.map((t) => t.tanggal)).toEqual(["2026-11-03"]);
    expect(r.hariIni).toEqual({ setoranMurni: 0, patokan: 0, persentase: null });
    expect(r.rataRata).toBe(75);
  });

  test("awal bulan tanpa hari lalu: rata-rata null", () => {
    const r = susunPerforma([baris("2026-11-02", 100, 200, 50)], ["2026-11-02"], "2026-11-02");
    expect(r.rataRata).toBeNull();
    expect(r.hariIni?.persentase).toBe(50);
  });
});

describe("rata-rata murni & sorotan bulan", () => {
  test("hanya hari lewat yang bernilai: rata murni, terbaik, terendah, hari ≥ 90%", () => {
    const r = susunPerforma(DERET, TAGIH, T);
    expect(r.hariDinilai).toBe(2);
    expect(r.rataMurni).toBe(1_900_000); // (1.800.000 + 2.000.000) / 2; hari ini tak ikut
    expect(r.sorotan.terbaik?.tanggal).toBe("2026-11-03");
    expect(r.sorotan.terendah?.tanggal).toBe("2026-11-02");
    expect(r.sorotan.hariTarget).toBe(2);
  });

  test("belum ada hari lewat: kosong, bukan nol", () => {
    const r = susunPerforma([baris("2026-11-02", 500, 1_000, 50)], ["2026-11-02"], "2026-11-02");
    expect(r).toMatchObject({ rataMurni: null, hariDinilai: 0, sorotan: { terbaik: null } });
  });
});

describe("tingkat performa (lima tingkat aplikasi lama)", () => {
  test("ambang dibaca pada angka yang dibulatkan", () => {
    expect(tingkatDari(45.6).label).toBe("Buruk"); // tampil 46%
    expect(tingkatDari(45.4).label).toBe("Rusak");
    expect(tingkatDari(69.5).label).toBe("Baik");
    expect(tingkatDari(100).label).toBe("Sempurna");
    expect(tingkatDari(100.6).label).toBe("Luar Biasa");
    expect(tingkatDari(null)).toEqual({ kunci: "kosong", label: "Belum Ada" });
  });

  test("legenda lima tingkat, tertinggi dulu", () => {
    expect(LEGENDA_TINGKAT.map((t) => `${t.label} ${t.rentang}`)).toEqual([
      "Luar Biasa >100%",
      "Sempurna 90–100%",
      "Baik 70–89%",
      "Buruk 46–69%",
      "Rusak ≤45%",
    ]);
  });
});
