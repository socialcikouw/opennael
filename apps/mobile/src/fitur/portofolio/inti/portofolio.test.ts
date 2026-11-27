import { describe, expect, test } from "bun:test";
import type { ArusJenis, Portofolio, PotretJenis } from "@opennael/contracts";
import {
  kartuAngsuran,
  kartuNasabah,
  kartuPenyelesaian,
  sorotSaldoAkhir,
  susunPortofolio,
} from "./kartu-portofolio";
import { pembandingUntuk, piutangAktif, portofolioUntuk } from "./portofolio";

const nol = { jumlah: 0, saldo: 0, angsuran: 0, tabungan: 0 };
const potretNol: PotretJenis = {
  jumlahBerjalan: 0,
  jumlahMacet: 0,
  saldoBerjalan: 0,
  saldoMacet: 0,
  angsuranBerjalan: 0,
  angsuranMacet: 0,
};
const arusNol: ArusJenis = {
  lunas: 0,
  pokokLunas: 0,
  macetBaru: 0,
  tabunganKeluar: 0,
  pokokBerkurang: 0,
};

const DATA: Portofolio = {
  harian: {
    berjalan: { jumlah: 40, saldo: 20_000_000, angsuran: 2_000_000, tabungan: 3_000_000 },
    macet: { jumlah: 3, saldo: 1_500_000, angsuran: 150_000, tabungan: 100_000 },
    diputihkan: { jumlah: 1, saldo: 800_000, angsuran: 50_000, tabungan: 0 },
    lunas: { jumlah: 120, pokok: 120_000_000 },
    penyelesaian: { pokokBerkurang: 500_000, tabunganKeluar: 900_000 },
  },
  mingguan: {
    berjalan: { jumlah: 10, saldo: 9_000_000, angsuran: 1_500_000, tabungan: 0 },
    macet: nol,
    diputihkan: nol,
    lunas: { jumlah: 8, pokok: 8_000_000 },
    penyelesaian: { pokokBerkurang: 0, tabunganKeluar: 0 },
  },
  tempoan: {
    berjalan: { jumlah: 2, saldo: 2_500_000, angsuran: 2_500_000, tabungan: 0 },
    macet: { jumlah: 1, saldo: 1_250_000, angsuran: 1_250_000, tabungan: 0 },
    diputihkan: { jumlah: 2, saldo: 2_000_000, angsuran: 2_000_000, tabungan: 0 },
    lunas: { jumlah: 4, pokok: 2_000_000 },
    penyelesaian: { pokokBerkurang: 0, tabunganKeluar: 100_000 },
  },
  pembanding: {
    tanggalPotret: "2026-10-31",
    potret: {
      harian: {
        jumlahBerjalan: 38,
        jumlahMacet: 1,
        saldoBerjalan: 18_000_000,
        saldoMacet: 1_000_000,
        angsuranBerjalan: 1_900_000,
        angsuranMacet: 50_000,
      },
      mingguan: { ...potretNol, jumlahBerjalan: 10, saldoBerjalan: 9_000_000 },
      tempoan: potretNol,
    },
    bulanIni: {
      mulai: "2026-11-01",
      selesai: "2026-11-28",
      arus: {
        harian: {
          lunas: 6,
          pokokLunas: 6_000_000,
          macetBaru: 2,
          tabunganKeluar: 300_000,
          pokokBerkurang: 0,
        },
        mingguan: arusNol,
        tempoan: arusNol,
      },
    },
    bulanLalu: {
      mulai: "2026-10-01",
      selesai: "2026-10-28",
      arus: {
        harian: {
          lunas: 4,
          pokokLunas: 4_000_000,
          macetBaru: 1,
          tabunganKeluar: 300_000,
          pokokBerkurang: 0,
        },
        mingguan: arusNol,
        tempoan: arusNol,
      },
    },
  },
};

describe("portofolio per jenis", () => {
  test("semua jenis: tiap status & lunas dijumlah", () => {
    expect(portofolioUntuk(DATA, null)).toMatchObject({
      berjalan: { jumlah: 52, saldo: 31_500_000 },
      macet: { jumlah: 4, saldo: 2_750_000 },
      lunas: { jumlah: 132, pokok: 130_000_000 },
    });
    expect(piutangAktif(DATA.harian)).toEqual({ jumlah: 43, saldo: 21_500_000, macet: 3 });
  });

  test("pembanding: potret & arus dijumlah lintas jenis, label bulan", () => {
    const pb = pembandingUntuk(DATA.pembanding, null);
    expect(pb.potret).toMatchObject({ jumlahBerjalan: 48, saldoBerjalan: 27_000_000 });
    expect(pb.labelPotret).toBe("akhir Oktober");
    expect(pb.labelArus).toBe("Oktober 1–28");
    expect(pb.ini.lunas).toBe(6);
  });
});

describe("kartu portofolio ber-delta", () => {
  const pbHarian = pembandingUntuk(DATA.pembanding, "harian");

  test("saldo akhir naik = hijau; saldo macet naik = merah", () => {
    const s = sorotSaldoAkhir(DATA.harian, pbHarian);
    expect(s.selisih).toEqual({
      arah: "naik",
      nada: "baik",
      teks: "+Rp 2.500.000 (13%) vs akhir Oktober",
    });
    expect(s.keping[1]?.selisih).toMatchObject({ arah: "naik", nada: "buruk" });
  });

  test("nasabah aktif: delta hitungan; macet baru & lunas bulan ini vs bulan lalu", () => {
    const k = kartuNasabah(DATA.harian, pbHarian);
    expect(k.selisih?.teks).toBe("+4 nasabah (10%) vs akhir Oktober");
    const baris = Object.fromEntries(k.rincian.map((r) => [r.label, r]));
    expect(baris["Macet baru bulan ini"]).toMatchObject({
      nilai: 2,
      selisih: { nada: "buruk", teks: "+1 orang (100%) vs Oktober 1–28" },
    });
    expect(baris["Lunas bulan ini"]?.selisih).toMatchObject({ nada: "baik" });
  });

  test("target angsuran semua jenis = harian; penyelesaian bulan ini", () => {
    expect(kartuAngsuran(DATA, null)).toMatchObject({
      judul: "Target Angsuran Harian",
      nilai: 2_150_000,
    });
    const p = kartuPenyelesaian(DATA.harian, pbHarian);
    expect(p).toMatchObject({ nilai: 6_000_000 });
    expect(p.selisih?.teks).toBe("+Rp 2.000.000 (50%) vs Oktober 1–28");
    expect(p.rincian[0]?.selisih?.arah).toBe("tetap");
  });

  test("susunan: Per Jenis hanya Semua; tanpa potret = tanpa delta posisi", () => {
    expect(susunPortofolio(DATA, null).kartu.map((k) => k.kunci)).toEqual([
      "per-jenis",
      "nasabah",
      "angsuran",
      "tabungan",
      "penyelesaian",
      "diputihkan",
    ]);
    const tanpaPotret = { ...DATA, pembanding: { ...DATA.pembanding, potret: null } };
    expect(susunPortofolio(tanpaPotret, "harian").sorot.selisih).toBeNull();
  });
});
