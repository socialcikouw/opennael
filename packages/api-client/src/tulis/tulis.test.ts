import { describe, expect, test } from "bun:test";
import type { Ambil } from "../bahan";
import type { Klien } from "../klien";
import { buatTulis } from "./index";

/** Klien palsu: setiap rantai `api.a.b.$post(x)` menjawab `{ jalur, argumen }` tanpa jaringan. */
type Panggilan = { jalur: string; argumen: unknown[] };

function rantai(jalur: string[]): unknown {
  return new Proxy(() => {}, {
    get: (_, nama) => rantai([...jalur, String(nama)]),
    apply: (_, __, argumen): Panggilan => ({ jalur: jalur.join("."), argumen }),
  });
}

const ambil = (async (kirim: () => Promise<unknown>) => kirim()) as unknown as Ambil;
const tulis = buatTulis({ api: rantai([]) as Klien, ambil });

const A = "alasan salah catat";

/** [nama, pemanggil, jalur rute, argumen panggilan] */
const KASUS: [string, () => Promise<unknown>, string, unknown[]][] = [
  [
    "pinjaman",
    () => tulis.batal.pinjaman("p1", A),
    "pembiayaan.pinjaman.:id.batal.$post",
    [{ param: { id: "p1" }, json: { alasan: A } }],
  ],
  [
    "pemutihan",
    () => tulis.batal.pemutihan("p1", A),
    "pembiayaan.pinjaman.:id.putihkan.batal.$post",
    [{ param: { id: "p1" }, json: { alasan: A } }],
  ],
  [
    "transaksi",
    () => tulis.batal.transaksi("t1", A),
    "pembiayaan.transaksi.:id.batal.$post",
    [{ param: { id: "t1" }, json: { alasan: A } }],
  ],
  [
    "transferSetoran",
    () => tulis.batal.transferSetoran("x1", A),
    "hariKolektor.transfer-setoran.:id.batal.$post",
    [{ param: { id: "x1" }, json: { alasan: A } }],
  ],
  [
    "serahTerimaKas",
    () => tulis.batal.serahTerimaKas("s1", A),
    "hariKolektor.serah-terima-kas.:id.batal.$post",
    [{ param: { id: "s1" }, json: { alasan: A } }],
  ],
  [
    "biayaTakTerduga",
    () => tulis.batal.biayaTakTerduga("b1", A),
    "hariKolektor.biaya-tak-terduga.:id.batal.$post",
    [{ param: { id: "b1" }, json: { alasan: A } }],
  ],
  [
    "laporanKolektor",
    () => tulis.batal.laporanKolektor("k1", A),
    "hariKolektor.hari-kolektor.:kolektorId.laporan.batal.$post",
    [{ param: { kolektorId: "k1" }, json: { alasan: A } }],
  ],
  [
    "mutasiKas",
    () => tulis.batal.mutasiKas("m1", A),
    "kas.kas.mutasi.:id.batal.$post",
    [{ param: { id: "m1" }, json: { alasan: A } }],
  ],
  [
    "pencocokanKas",
    () => tulis.batal.pencocokanKas("c1", A),
    "kas.kas.pencocokan.:id.batal.$post",
    [{ param: { id: "c1" }, json: { alasan: A } }],
  ],
  [
    "gaji",
    () => tulis.batal.gaji("g1", A),
    "penggajian.kas.gaji.:id.batal.$post",
    [{ param: { id: "g1" }, json: { alasan: A } }],
  ],
  [
    "penarikanTabungan",
    () => tulis.batal.penarikanTabungan("w1", A),
    "pembiayaan.penarikan-tabungan.:id.batal.$post",
    [{ param: { id: "w1" }, json: { alasan: A } }],
  ],
];

describe("tulisan bersama: pembatalan", () => {
  test.each(KASUS)(
    "batal.%s memanggil rute dan isi yang dimaksud",
    async (_nama, panggil, jalur, argumen) => {
      expect(await panggil()).toEqual({ jalur, argumen });
    },
  );

  test("setiap pembatalan di katalog punya satu baris uji", () => {
    expect(Object.keys(tulis.batal).sort()).toEqual(KASUS.map(([nama]) => nama).sort());
  });
});
