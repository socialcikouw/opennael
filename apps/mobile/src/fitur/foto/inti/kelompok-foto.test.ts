import { describe, expect, test } from "bun:test";
import type { KartuTagih } from "@opennael/contracts";
import { kelompokFoto } from "./kelompok-foto";

let n = 0;
function kartu(nama: string, kampung: string, isi: Partial<KartuTagih> = {}): KartuTagih {
  n += 1;
  return {
    id: `p${n}`,
    nasabah: { id: `n-${nama}`, nama, kampung },
    pinjamanKe: 1,
    jenis: "harian",
    tenor: 25,
    asal: "baru",
    status: "berjalan",
    tanggalAkad: "2026-10-01",
    waktuAkad: null,
    jatuhTempo: null,
    batasTempo: null,
    hariTempo: 0,
    pokok: 500_000,
    potonganAdmin: 0,
    tabunganMasuk: 0,
    pencairan: 500_000,
    totalKembali: 600_000,
    angsuran: 25_000,
    saldo: 300_000,
    angsuranKe: 12,
    fotoSerahTerimaId: `f${n}`,
    dropBaru: 500_000,
    dropGulung: 0,
    jenisGulung: null,
    tabungan: 0,
    ruteKe: 1,
    hariIni: null,
    ...isi,
  };
}

describe("galeri foto nasabah", () => {
  test("per kampung urut rute, nama urut abjad, tanpa foto tak tampil", () => {
    const g = kelompokFoto([
      kartu("sari", "pule barat", { ruteKe: 2 }),
      kartu("budi", "sukamaju", { ruteKe: 1 }),
      kartu("ani", "pule barat", { ruteKe: 2 }),
      kartu("tono", "sukamaju", { ruteKe: 1, fotoSerahTerimaId: null }),
    ]);
    expect(g.map((k) => k.kampung)).toEqual(["sukamaju", "pule barat"]);
    expect(g[1]?.foto.map((f) => f.nama)).toEqual(["ani", "sari"]);
    expect(g[0]?.foto).toHaveLength(1);
  });

  test("satu foto per nasabah: akad terakhir yang berfoto", () => {
    const g = kelompokFoto([
      kartu("sari", "sawah", { tanggalAkad: "2026-09-01", fotoSerahTerimaId: "lama" }),
      kartu("sari", "sawah", { tanggalAkad: "2026-11-01", fotoSerahTerimaId: "baru" }),
    ]);
    expect(g[0]?.foto.map((f) => f.fotoId)).toEqual(["baru"]);
  });

  test("cari nama tanpa peduli huruf besar; kampung tanpa yang cocok hilang", () => {
    const daftar = [kartu("siti aminah", "sukamaju"), kartu("budi", "pule barat")];
    const g = kelompokFoto(daftar, "  SITI ");
    expect(g).toHaveLength(1);
    expect(g[0]?.foto[0]?.nama).toBe("siti aminah");
  });

  test("kartu foto membawa angsuran ke-, nominal angsuran, dan tanda macet", () => {
    const [k] = kelompokFoto([
      kartu("budi", "pule", { angsuranKe: 9, angsuran: 50_000, status: "macet" }),
    ]);
    expect(k?.foto[0]).toMatchObject({ angsuranKe: 9, angsuran: 50_000, macet: true });
  });
});
