import { describe, expect, test } from "bun:test";
import type { IndeksBuku } from "@opennael/contracts";
import { hurufIndeks, keadaanNasabah, susunIndeks } from "./buku";

let n = 0;
function nasabah(
  nama: string,
  kampung: string,
  status: IndeksBuku["terakhir"]["status"],
  jumlahPinjaman = 1,
): IndeksBuku {
  n += 1;
  return {
    nasabah: { id: `n${n}`, nama, kampung },
    jumlahPinjaman,
    terakhir: {
      id: `p${n}`,
      pinjamanKe: jumlahPinjaman,
      jenis: "harian",
      status,
      pokok: 1_000_000,
      saldo: status === "lunas" ? 0 : 500_000,
      tanggalAkad: "2026-10-01",
      tanggalSelesai: status === "lunas" ? "2026-11-01" : null,
    },
  };
}

const DAFTAR = [
  nasabah("budi", "pule", "berjalan", 3),
  nasabah("ani", "sukamaju", "lunas", 2),
  nasabah("bayu", "pule", "macet"),
  nasabah("citra", "pule barat", "diputihkan"),
  nasabah("1 andi", "pule", "berjalan"),
];

describe("buku kolektor", () => {
  test("keadaan nasabah dari pinjaman terbaru", () => {
    expect(DAFTAR.map(keadaanNasabah)).toEqual(["aktif", "selesai", "macet", "selesai", "aktif"]);
  });

  test("huruf indeks: A–Z, selain itu #", () => {
    expect(hurufIndeks("  siti")).toBe("S");
    expect(hurufIndeks("1 andi")).toBe("#");
  });

  test("seksi abjad (# di belakang), nama urut; angka pil per saringan", () => {
    const r = susunIndeks(DAFTAR, "semua", "");
    expect(r.seksi.map((s) => [s.huruf, s.data.map((d) => d.nasabah.nama)])).toEqual([
      ["A", ["ani"]],
      ["B", ["bayu", "budi"]],
      ["C", ["citra"]],
      ["#", ["1 andi"]],
    ]);
    expect(r.jumlah).toEqual({ semua: 5, aktif: 2, macet: 1, selesai: 2 });
    expect(r.jumlahPinjaman).toBe(8);
  });

  test("saringan & cari nama atau kampung (angka pil ikut pencarian)", () => {
    const aktif = susunIndeks(DAFTAR, "aktif", "");
    expect(aktif.seksi.flatMap((s) => s.data.map((d) => d.nasabah.nama))).toEqual([
      "budi",
      "1 andi",
    ]);
    const cari = susunIndeks(DAFTAR, "semua", "PULE BARAT");
    expect(cari.seksi.flatMap((s) => s.data.map((d) => d.nasabah.nama))).toEqual(["citra"]);
    expect(cari.jumlah).toEqual({ semua: 1, aktif: 0, macet: 0, selesai: 1 });
  });
});
