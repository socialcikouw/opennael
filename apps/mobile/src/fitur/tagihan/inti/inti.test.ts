import { describe, expect, test } from "bun:test";
import type { KartuTagih, Peristiwa } from "@opennael/contracts";
import { jumlahSegmen, kemajuan, pilah, ringkasDroping, susunBaris } from "./daftar";
import { nominalK, susunBahanGrid, susunGrid, susunKerangka } from "./grid";
import { kartuVM } from "./kartu";

// Kamis 29 Okt 2026.
const KAMIS = "2026-10-29";

function kartu(isi: Partial<KartuTagih> = {}): KartuTagih {
  return {
    id: crypto.randomUUID(),
    nasabah: { id: crypto.randomUUID(), nama: "Sari", kampung: "Pule Barat" },
    pinjamanKe: 1,
    jenis: "harian",
    tenor: 24,
    asal: "baru",
    status: "berjalan",
    tanggalAkad: "2026-10-01",
    jatuhTempo: null,
    pokok: 1_000_000,
    potonganAdmin: 50_000,
    tabunganMasuk: 50_000,
    pencairan: 900_000,
    totalKembali: 1_200_000,
    angsuran: 50_000,
    saldo: 600_000,
    angsuranKe: 12,
    fotoSerahTerimaId: null,
    dropBaru: 1_000_000,
    dropGulung: 0,
    jenisGulung: null,
    tabungan: 60_000,
    ruteKe: 1,
    hariIni: null,
    ...isi,
  };
}

function peristiwa(pinjamanId: string, tanggal: string, isi: Partial<Peristiwa> = {}): Peristiwa {
  const orang = { id: crypto.randomUUID(), nama: "x" };
  return {
    id: crypto.randomUUID(),
    pinjamanId,
    nasabah: orang,
    pencatat: orang,
    tanggal,
    kategori: "angsuran",
    setoranMurni: 50_000,
    setoranPelunasan: 0,
    tabunganKeluar: 0,
    storting: 50_000,
    saldoSesudah: 0,
    alasanLibur: null,
    dibuatAt: `${tanggal}T10:00:00Z`,
    ...isi,
  };
}

describe("grid setoran sebulan", () => {
  test("kerangka: Senin pekan tanggal 1 s/d pekan berjalan; kolom hari ini", () => {
    const k = susunKerangka(KAMIS);
    // 1 Okt = Kamis → pekan pertama Senin 28 Sep; pekan berjalan Senin 26 Okt.
    expect(k.pekan).toHaveLength(5);
    expect(k.pekan[0]?.hari[0]?.tanggal).toBe("2026-09-28");
    expect(k.pekan[0]?.hari[0]?.statis).toBe(true);
    expect(k.pekan[4]?.berjalan).toBe(true);
    expect(k.kolomHariIni).toBe(3);
    // Tanggal 1 hari Minggu: mulai Senin tanggal 2.
    expect(susunKerangka("2026-11-03").pekan[0]?.hari[0]?.tanggal).toBe("2026-11-02");
  });

  test("sel: nominal, X libur, — libur kantor, · bolos; hari ini belum bolos", () => {
    const p = kartu();
    const bahan = susunBahanGrid(
      KAMIS,
      [
        peristiwa(p.id, "2026-10-26"),
        peristiwa(p.id, "2026-10-27", { kategori: "libur", storting: 0 }),
      ],
      {
        hariTagih: ["2026-10-19", "2026-10-26", "2026-10-27", "2026-10-29", "2026-10-30"],
        liburKantor: [{ tanggal: "2026-10-28", alasan: "Rapat" }],
      },
    );
    const pekanIni = susunGrid(bahan, p)[4]?.sel.map((s) => s.teks);
    expect(pekanIni).toEqual(["50k", "X", "—", "", "", ""]);
    expect(susunGrid(bahan, p)[4]?.sel[3]?.hariIni).toBe(true);
    // Hari tagih lampau tanpa catatan = bolos.
    expect(susunGrid(bahan, p)[3]?.sel[0]).toMatchObject({ teks: "·", kategori: "bolos" });
    expect(nominalK(1_250_000)).toBe("1.250k");
  });

  test("sebelum akad kosong; riwayat belum dimuat = kosong, bukan bolos", () => {
    const p = kartu({ tanggalAkad: "2026-10-20" });
    const bahan = susunBahanGrid(KAMIS, undefined, undefined);
    expect(
      susunGrid(bahan, p)
        .flatMap((b) => b.sel)
        .every((s) => s.teks === ""),
    ).toBe(true);
  });
});

describe("kartu nasabah", () => {
  const bahan = susunBahanGrid(KAMIS, [], { hariTagih: [], liburKantor: [] });

  test("harian: ambang gulung E4, Bayar bernominal, wajib hari ini", () => {
    const vm = kartuVM(kartu({ pinjamanKe: 2, angsuranKe: 11 }), KAMIS, bahan);
    expect(vm.ember).toBe("belum");
    expect(vm.wajib).toBe(true);
    expect(vm.lingkaran).toBe("2x");
    expect(vm.progres).toMatchObject({ status: "belum", kotak: "11", ambang: 0.5 });
    expect(vm.progres?.petunjuk).toBe("Gulung mulai angsuran ke-12");
    expect(vm.bayarTeks).toBe("Rp 50.000");
    expect(vm.grid).not.toBeNull();
  });

  test("macet, droping (lencana asal), sudah ditagih (kartu ringkas)", () => {
    expect(kartuVM(kartu({ status: "macet" }), KAMIS, bahan).lencana?.teks).toBe("Macet");
    const drop = kartuVM(
      kartu({ tanggalAkad: KAMIS, asal: "gulung", jenisGulung: "naik" }),
      KAMIS,
      bahan,
    );
    expect(drop.ember).toBe("droping");
    expect(drop.lencana?.teks).toBe("Gulung naik");
    expect(drop.aksi).toBe(false);
    const sudah = kartuVM(
      kartu({ hariIni: { jenis: "angsuran", storting: 50_000 } }),
      KAMIS,
      bahan,
    );
    expect(sudah.ember).toBe("sudah");
    expect(sudah.judulSudah).toBe("SUDAH BAYAR • 50K");
  });

  test("tempoan: tombol utama Lunasi seharga saldo, tanpa libur; mingguan berhari tagih", () => {
    const t = kartuVM(kartu({ jenis: "tempoan", tenor: 14, saldo: 1_250_000 }), KAMIS, bahan);
    expect(t.sekaliBayar).toBe(true);
    expect(t.bayarTeks).toBe("Rp 1.250.000");
    expect(t.tampilkanLibur).toBe(false);
    const m = kartuVM(
      kartu({ jenis: "mingguan", tenor: 8, tanggalAkad: "2026-10-22" }),
      KAMIS,
      bahan,
    );
    expect(m.hariTagih).toBe("Kamis");
    expect(m.subjudul).toBe("pule barat · mingguan 8×");
  });

  test("VM dipakai ulang selama data & bahan sama", () => {
    const p = kartu();
    expect(kartuVM(p, KAMIS, bahan)).toBe(kartuVM(p, KAMIS, bahan));
  });
});

describe("daftar tagihan", () => {
  const bahan = susunBahanGrid(KAMIS, [], { hariTagih: [], liburKantor: [] });
  const vm = (isi: Partial<KartuTagih>) => kartuVM(kartu(isi), KAMIS, bahan);

  test("pilah segmen, judul rute bertotal, sudah ditagih di dasar", () => {
    const semua = [
      vm({ nasabah: { id: "a", nama: "Sari", kampung: "Pule" }, ruteKe: 1 }),
      vm({ nasabah: { id: "b", nama: "Budi", kampung: "Pule" }, ruteKe: 1, angsuran: 40_000 }),
      vm({ nasabah: { id: "c", nama: "Citra", kampung: "Sawah" }, ruteKe: null }),
      vm({ status: "macet" }),
      vm({ tanggalAkad: KAMIS, dropBaru: 1_000_000 }),
      vm({ hariIni: { jenis: "libur", alasan: null } }),
    ];
    const p = pilah(semua, "");
    expect(jumlahSegmen(p)).toEqual({ aktif: 3, macet: 1, droping: 1 });
    const baris = susunBaris(p.aktif, p.sudah.aktif);
    expect(
      baris.filter((b) => b.jenis === "judul").map((b) => b.jenis === "judul" && b.label),
    ).toEqual(["Rute 1 - PULE", "Belum diatur - SAWAH", "Sudah ditagih"]);
    expect(baris[0]).toMatchObject({ ringkas: "2 = 90K" });
    expect(kemajuan(semua)).toEqual({ bayar: 0, libur: 1, sisa: 4 });
    expect(ringkasDroping(p.droping)).toEqual({ baru: 1_000_000, gulung: 0 });
    expect(pilah(semua, "sawah").aktif).toHaveLength(1);
  });
});
