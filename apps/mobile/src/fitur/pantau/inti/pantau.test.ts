import { describe, expect, test } from "bun:test";
import type { HariKas, KartuTagih, TransaksiHari } from "@opennael/contracts";
import { barisArusKas, keadaanKas } from "./arus-kas";
import { barisDroping, dropingHariIni, ringkasDroping } from "./droping";
import { hitungPerJenis, saringJenis } from "./jenis";
import { barisStorting, ringkasStorting } from "./storting";

const T = "2026-11-01";

const setoran = (ubah: Partial<TransaksiHari> = {}): TransaksiHari => ({
  id: "t1",
  pinjamanId: "p1",
  nasabah: { id: "n1", nama: "SITI" },
  kampung: "Pule",
  jenisPinjaman: "harian",
  jenis: "angsuran",
  setoranMurni: 50_000,
  setoranPelunasan: 0,
  tabunganKeluar: 0,
  storting: 50_000,
  batasTransfer: 50_000,
  transfer: null,
  ...ubah,
});

const kartu = (ubah: Partial<KartuTagih> = {}): KartuTagih => ({
  id: "p1",
  nasabah: { id: "n1", nama: "Budi", kampung: "Pule" },
  pinjamanKe: 1,
  jenis: "harian",
  tenor: 24,
  asal: "baru",
  status: "berjalan",
  tanggalAkad: T,
  waktuAkad: `${T}T02:00:00.000Z`,
  jatuhTempo: null,
  pokok: 1_000_000,
  potonganAdmin: 50_000,
  tabunganMasuk: 50_000,
  pencairan: 900_000,
  totalKembali: 1_200_000,
  angsuran: 50_000,
  saldo: 1_200_000,
  angsuranKe: 0,
  fotoSerahTerimaId: null,
  dropBaru: 1_000_000,
  dropGulung: 0,
  jenisGulung: null,
  tabungan: 50_000,
  ruteKe: null,
  hariIni: null,
  ...ubah,
});

describe("saringan jenis", () => {
  test("angka per pil dan saringan satu jenis", () => {
    const daftar = [
      setoran(),
      setoran({ id: "t2", jenisPinjaman: "mingguan" }),
      setoran({ id: "t3" }),
    ];
    const jenis = (t: TransaksiHari) => t.jenisPinjaman;
    expect(hitungPerJenis(daftar, jenis)).toEqual({
      semua: 3,
      harian: 2,
      mingguan: 1,
      tempoan: 0,
    });
    expect(saringJenis(daftar, "mingguan", jenis).map((t) => t.id)).toEqual(["t2"]);
    expect(saringJenis(daftar, "semua", jenis)).toHaveLength(3);
  });
});

describe("storting", () => {
  test("ringkasan menjumlah penyusun storting dan transfer", () => {
    const r = ringkasStorting([
      setoran({ transfer: { id: "tf", nominal: 20_000 } }),
      setoran({
        id: "t2",
        jenis: "pelunasan",
        setoranMurni: 0,
        setoranPelunasan: 100_000,
        tabunganKeluar: 150_000,
        storting: -50_000,
      }),
    ]);
    expect(r).toEqual({
      total: 0,
      murni: 50_000,
      pelunasan: 100_000,
      tabunganKeluar: 150_000,
      transfer: 20_000,
      jumlah: 2,
    });
  });

  test("angsuran polos tanpa rincian; pelunasan bertabungan dirinci", () => {
    expect(barisStorting(setoran()).rincian).toBeNull();
    const lunas = barisStorting(
      setoran({
        jenis: "pelunasan",
        setoranMurni: 50_000,
        setoranPelunasan: 100_000,
        tabunganKeluar: 30_000,
        storting: 120_000,
        transfer: { id: "tf", nominal: 50_000 },
      }),
    );
    expect(lunas).toMatchObject({
      jenisTransaksi: "Pelunasan",
      storting: 120_000,
      transfer: 50_000,
      kampung: "Pule",
      jenis: "harian",
    });
    expect(lunas.rincian).toBe(
      "murni Rp 50.000 · pelunasan Rp 100.000 · tabungan keluar Rp 30.000",
    );
  });
});

describe("droping", () => {
  test("hanya akad hari ini yang bukan migrasi, terbaru dulu", () => {
    const daftar = [
      kartu({ id: "a", waktuAkad: `${T}T01:00:00.000Z` }),
      kartu({ id: "lama", tanggalAkad: "2026-10-20" }),
      kartu({ id: "mig", asal: "migrasi", waktuAkad: null }),
      kartu({ id: "b", waktuAkad: `${T}T03:00:00.000Z` }),
    ];
    expect(dropingHariIni(daftar, T).map((p) => p.id)).toEqual(["b", "a"]);
  });

  test("ringkasan: droping = drop baru + drop gulung; pencairan terpisah", () => {
    const r = ringkasDroping([
      kartu(),
      kartu({
        id: "g",
        asal: "gulung",
        jenisGulung: "naik",
        pokok: 2_000_000,
        dropBaru: 800_000,
        dropGulung: 1_200_000,
        pencairan: 700_000,
      }),
    ]);
    expect(r).toEqual({
      total: 3_000_000,
      baru: 1_800_000,
      gulung: 1_200_000,
      pencairan: 1_600_000,
      jumlah: 2,
    });
  });

  test("label asal: akad baru atau gulung naik/tetap/turun", () => {
    expect(barisDroping(kartu()).asal).toBe("Akad baru");
    const g = barisDroping(kartu({ asal: "gulung", jenisGulung: "turun" }));
    expect(g).toMatchObject({ asal: "Gulung turun", gulung: true });
  });
});

describe("arus kas (I1)", () => {
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

  test("baris bertanda menyusun tunai seharusnya", () => {
    const baris = barisArusKas(rincian);
    const hitung = baris.reduce((t, b) => (b.tanda === "keluar" ? t - b.nilai : t + b.nilai), 0);
    expect(hitung).toBe(rincian.tunaiSeharusnya);
    expect(baris.map((b) => b.tanda)).toEqual([
      "awal",
      "masuk",
      "masuk",
      "masuk",
      "keluar",
      "keluar",
      "keluar",
    ]);
  });

  test("keadaan hari mengikuti alur: absen → laporan → kas diterima", () => {
    const hari: HariKas = {
      id: "h",
      kolektor: { id: "k", nama: "Andi" },
      tanggal: T,
      absensi: "masuk_kerja",
      alasanTidakKerja: null,
      kasLapangan: 1_000_000,
      uangJalan: 50_000,
      laporanDibukaAt: null,
      rincian,
      serahTerima: null,
    };
    expect(keadaanKas(undefined)).toBe("belum-absen");
    expect(keadaanKas({ ...hari, absensi: "tidak_kerja" })).toBe("tidak-kerja");
    expect(keadaanKas(hari)).toBe("lapangan");
    expect(keadaanKas({ ...hari, laporanDibukaAt: `${T}T09:00:00.000Z` })).toBe("laporan");
    expect(
      keadaanKas({
        ...hari,
        laporanDibukaAt: `${T}T09:00:00.000Z`,
        serahTerima: {
          id: "s",
          tunaiSeharusnya: 1_250_000,
          tunaiDiterima: 1_200_000,
          selisihSetor: -50_000,
          tekor: 50_000,
          lebihSetor: 0,
          diterimaOleh: { id: "ks", nama: "Kasir" },
          dibuatAt: `${T}T10:00:00.000Z`,
        },
      }),
    ).toBe("diterima");
  });
});
