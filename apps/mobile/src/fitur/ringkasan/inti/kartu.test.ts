import { describe, expect, test } from "bun:test";
import type { PratinjauGaji, Ringkasan } from "@opennael/contracts";
import { type BahanKartu, kartuSetoran, kartuStorting, susunKartu } from "./kartu";
import { sorotGaji, sorotStortingJenis } from "./sorot";

function ringkasan(ubah: Partial<Ringkasan> = {}): Ringkasan {
  return {
    mulai: "2026-11-01",
    selesai: "2026-11-27",
    penagihan: {
      jumlahSetoran: 40,
      setoranMurni: 3_800_000,
      setoranPelunasan: 400_000,
      tabunganKeluar: 200_000,
      storting: 4_000_000,
      transfer: 500_000,
    },
    akad: {
      jumlahAkad: 3,
      droping: 3_000_000,
      dropBaru: 2_000_000,
      dropGulung: 1_000_000,
      pokokBerkurang: 0,
      potonganAdmin: 150_000,
      tabunganMasuk: 100_000,
      pencairan: 2_750_000,
    },
    kasLapangan: {
      hariKerja: 20,
      kasLapangan: 20_000_000,
      uangJalan: 1_000_000,
      transfer: 500_000,
      biayaTakTerduga: 60_000,
      tunaiDiterima: 21_000_000,
      tekor: 50_000,
      lebihSetor: 0,
    },
    perJenis: [
      {
        jenis: "harian",
        jumlahSetoran: 35,
        storting: 3_000_000,
        jumlahAkad: 2,
        droping: 2_000_000,
      },
      {
        jenis: "mingguan",
        jumlahSetoran: 5,
        storting: 1_000_000,
        jumlahAkad: 1,
        droping: 1_000_000,
      },
      { jenis: "tempoan", jumlahSetoran: 0, storting: 0, jumlahAkad: 0, droping: 0 },
    ],
    ...ubah,
  };
}

const bahan = (ubah: Partial<BahanKartu> = {}): BahanKartu => ({
  data: ringkasan(),
  jenis: null,
  hariIni: false,
  pembanding: null,
  ...ubah,
});

describe("kartu rincian", () => {
  test("semua jenis, periode: Storting · Droping · Potongan · Operasional · Setoran Sore", () => {
    expect(susunKartu(bahan()).map((k) => k.kunci)).toEqual([
      "storting",
      "droping",
      "potongan",
      "operasional",
      "setoran",
    ]);
  });

  test("hari ini: tanpa Setoran Sore (ada di Mutasi Kas); Storting & Droping bisa diketuk", () => {
    const kartu = susunKartu(bahan({ hariIni: true }));
    expect(kartu.map((k) => k.kunci)).toEqual(["storting", "droping", "potongan", "operasional"]);
    expect(kartu.map((k) => k.daftar)).toEqual(["storting", "droping", null, null]);
  });

  test("satu jenis: Droping & Potongan; tempoan tanpa potongan", () => {
    expect(susunKartu(bahan({ jenis: "harian" })).map((k) => k.kunci)).toEqual([
      "droping",
      "potongan",
    ]);
    expect(susunKartu(bahan({ jenis: "tempoan" })).map((k) => k.kunci)).toEqual(["droping"]);
  });

  test("storting: bar per jenis, tunai = storting − transfer, rata-rata per hari kerja", () => {
    const k = kartuStorting(
      bahan({
        pembanding: {
          data: ringkasan({ penagihan: { ...ringkasan().penagihan, storting: 3_200_000 } }),
          label: "Oktober 1–27",
        },
      }),
    );
    expect(k.segmen?.map((s) => [s.label, s.persenTeks])).toEqual([
      ["Harian", "75%"],
      ["Mingguan", "25%"],
      ["Tempoan", "0%"],
    ]);
    expect(k.rincian.find((r) => r.label === "Tunai")?.nilai).toBe(3_500_000);
    expect(k.meta).toBe("40 setoran · rata-rata Rp 200.000 per hari kerja");
    expect(k.selisih).toEqual({ arah: "naik", teks: "25% dari Oktober 1–27" });
    expect(k.kaki).toMatchObject({ label: "Tabungan keluar", nilai: 200_000 });
  });

  test("setoran sore: tekor merah, lebih setor nol tanpa warna", () => {
    const k = kartuSetoran(bahan());
    expect(k.nilai).toBe(21_000_000);
    expect(k.rincian.find((r) => r.label === "Tekor")?.nada).toBe("bahaya");
    expect(k.rincian.find((r) => r.label === "Lebih setor")?.nada).toBeUndefined();
  });
});

describe("kartu sorot", () => {
  const gaji = (ubah: Partial<PratinjauGaji> = {}): PratinjauGaji => ({
    kolektor: { id: "k1", nama: "rian" },
    periodeMulai: "2026-11-01",
    periodeSelesai: "2026-11-27",
    hari: [
      { tanggal: "2026-11-02", storting: 4_000_000, tarifBp: 500, tekor: 0 },
      { tanggal: "2026-11-03", storting: 0, tarifBp: 500, tekor: 50_000 },
    ],
    gajiKotor: 200_000,
    potonganTekor: 50_000,
    gajiBersih: 150_000,
    halangan: "PERIODE_BELUM_BERAKHIR",
    ...ubah,
  });

  test("gaji: perkiraan selama periode berjalan, rumus dari tarif sungguhan", () => {
    expect(sorotGaji(gaji())).toMatchObject({
      label: "Gaji",
      nilai: 150_000,
      lencana: "Perkiraan",
      rumus: "5% storting − tekor",
      keping: [
        { label: "Gaji kotor", nilai: 200_000 },
        { label: "Tekor", nilai: 50_000 },
      ],
    });
    expect(sorotGaji(gaji({ halangan: "PERIODE_SUDAH_DIBAYAR" })).lencana).toBe("Sudah Dibayar");
    expect(sorotGaji(gaji({ halangan: null })).lencana).toBeNull();
    expect(sorotGaji(gaji({ gajiBersih: -10 })).lencana).toBe("Minus");
    const duaTarif = gaji({
      hari: [
        { tanggal: "2026-11-02", storting: 1, tarifBp: 500, tekor: 0 },
        { tanggal: "2026-11-12", storting: 1, tarifBp: 650, tekor: 0 },
      ],
    });
    expect(sorotGaji(duaTarif).rumus).toBe("Tarif × storting − tekor");
  });

  test("storting satu jenis: murni & pelunasan, tabungan keluar di bawah", () => {
    const s = sorotStortingJenis(ringkasan(), "harian", null);
    expect(s).toMatchObject({
      label: "Storting Harian",
      nilai: 4_000_000,
      kepingBawah: { label: "Tabungan keluar", nilai: 200_000 },
    });
    expect(s.segmen?.map((x) => x.persenTeks)).toEqual(["90%", "10%"]);
  });
});
