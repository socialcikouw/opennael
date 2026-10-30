import { describe, expect, test } from "bun:test";
import type { KartuTagih } from "@opennael/contracts";
import { susunBahanGrid } from "./grid";
import { kartuVM } from "./kartu";
import { jumlahSaringan, saringSemua, susunBarisSemua } from "./semua";

// Kamis 29 Okt 2026.
const KAMIS = "2026-10-29";
const bahan = susunBahanGrid(KAMIS, undefined, undefined);

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

const baris = (isi: Partial<KartuTagih>) => susunBarisSemua(kartuVM(kartu(isi), KAMIS, bahan));

describe("direktori mode Semua", () => {
  test("kemajuan & keadaan hari ini per jenis", () => {
    expect(baris({})).toMatchObject({
      kemajuan: "Angsuran 12 dari 24",
      progres: 0.5,
      keadaan: "belum",
      keadaanTeks: "Belum ditagih",
      subjudul: "pule barat · ke-1",
    });
    // Akad Kamis 1 Okt: hari tagih Kamis — hari ini wajib.
    expect(baris({ jenis: "mingguan", tenor: 10, angsuranKe: 3 })).toMatchObject({
      kemajuan: "Minggu 3 dari 10 · tiap Kam",
      keadaan: "belum",
    });
    expect(
      baris({ jenis: "mingguan", tenor: 10, angsuranKe: 3, tanggalAkad: "2026-10-05" }),
    ).toMatchObject({ keadaan: "nanti", keadaanTeks: "Tagih Sen" });
    expect(
      baris({ jenis: "tempoan", tenor: 30, jatuhTempo: "2026-10-26", tanggalAkad: "2026-09-26" }),
    ).toMatchObject({ kemajuan: "Jatuh tempo 26 Okt", keadaan: "lewat", hariLewat: 3 });
    expect(baris({ tanggalAkad: KAMIS }).keadaan).toBe("baru");
    expect(baris({ hariIni: { jenis: "libur", alasan: null } }).keadaan).toBe("libur");
    expect(baris({ hariIni: { jenis: "angsuran", storting: 50_000 } }).keadaan).toBe("sudah");
    expect(baris({ status: "macet" }).keadaan).toBe("macet");
  });

  test("saring, cari, urut mendesak; angka pil tanpa kata kunci", () => {
    const daftar = [
      baris({ nasabah: { id: "a", nama: "Budi", kampung: "Kota" }, saldo: 100_000 }),
      baris({ status: "macet", saldo: 900_000 }),
      baris({
        jenis: "tempoan",
        tenor: 30,
        jatuhTempo: "2026-10-20",
        tanggalAkad: "2026-09-20",
        saldo: 50_000,
      }),
      baris({ hariIni: { jenis: "angsuran", storting: 50_000 } }),
    ];
    expect(jumlahSaringan(daftar)).toMatchObject({
      semua: 4,
      tagih: 2,
      harian: 3,
      tempoan: 1,
      macet: 1,
    });
    expect(saringSemua(daftar, "tagih", "", "rute").map((b) => b.nama)).toEqual(["Budi", "Sari"]);
    expect(saringSemua(daftar, "semua", "kota", "rute").map((b) => b.nama)).toEqual(["Budi"]);
    expect(saringSemua(daftar, "semua", "", "mendesak").map((b) => b.keadaan)).toEqual([
      "lewat",
      "macet",
      "belum",
      "sudah",
    ]);
    expect(saringSemua(daftar, "semua", "", "saldo")[0]?.saldo).toBe(900_000);
  });
});
