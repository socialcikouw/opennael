import { describe, expect, test } from "bun:test";
import type { KartuTagih } from "@opennael/contracts";
import { type BahanPengingat, jumlahTindakan, type Pengingat, susunPengingat } from "./pengingat";

const T = "2026-11-02"; // Senin
const BUKA = { buka: true, perluAbsen: false };

const kartu = (nama: string, ubah: Partial<KartuTagih> = {}): KartuTagih => ({
  id: nama,
  nasabah: { id: `n-${nama}`, nama, kampung: "Pule" },
  pinjamanKe: 1,
  jenis: "harian",
  tenor: 24,
  asal: "baru",
  status: "berjalan",
  tanggalAkad: "2026-10-20",
  waktuAkad: null,
  jatuhTempo: null,
  pokok: 1_000_000,
  potonganAdmin: 0,
  tabunganMasuk: 0,
  pencairan: 1_000_000,
  totalKembali: 1_200_000,
  angsuran: 50_000,
  saldo: 1_000_000,
  angsuranKe: 4,
  fotoSerahTerimaId: null,
  dropBaru: 1_000_000,
  dropGulung: 0,
  jenisGulung: null,
  tabungan: 0,
  ruteKe: null,
  hariIni: null,
  ...ubah,
});
const tempoan = (nama: string, jatuhTempo: string, ubah: Partial<KartuTagih> = {}) =>
  kartu(nama, {
    jenis: "tempoan",
    tenor: 14,
    tanggalAkad: "2026-10-01",
    jatuhTempo,
    saldo: 1_250_000,
    ...ubah,
  });

const bahan = (ubah: Partial<BahanPengingat> = {}): BahanPengingat => ({
  gerbang: BUKA,
  tanggal: T,
  pinjaman: [],
  gerbangMutasi: "masih-menagih",
  laporanJam: null,
  tunaiSeharusnya: null,
  serahTerima: null,
  ...ubah,
});
const kunci = (p: Pengingat[]) => p.map((x) => x.kunci);

describe("susunPengingat", () => {
  test("belum absen: formulir absen menunggu tindakan", () => {
    const hasil = susunPengingat(
      bahan({ gerbang: { buka: false, perluAbsen: true }, gerbangMutasi: "belum-absen" }),
    );
    expect(kunci(hasil)).toEqual(["absen"]);
    expect(jumlahTindakan(hasil)).toBe(1);
  });

  test("gerbang tertutup (libur kantor): kabar saja, daftar tagihan tak diributkan", () => {
    const hasil = susunPengingat(
      bahan({
        gerbang: { buka: false, perluAbsen: false, judul: "Libur kantor", isi: "Natal" },
        pinjaman: [kartu("Ani")],
      }),
    );
    expect(hasil).toEqual([
      expect.objectContaining({
        kunci: "gerbang",
        judul: "Libur kantor",
        isi: "Natal",
        tindakan: false,
      }),
    ]);
  });

  test("yang belum ditagih dirinci per jenis, berurutan, dengan nama & nominal", () => {
    const hasil = susunPengingat(
      bahan({
        pinjaman: [
          kartu("Ani"),
          kartu("Budi", { status: "macet" }),
          kartu("Cici", { hariIni: { jenis: "angsuran", storting: 50_000 } }),
          kartu("Dodi", {
            jenis: "mingguan",
            tenor: 8,
            tanggalAkad: "2026-10-26",
            angsuran: 150_000,
          }),
          kartu("Eko", { jenis: "mingguan", tenor: 8, tanggalAkad: "2026-10-27" }), // bukan hari tagih
          tempoan("Fajar", T),
          tempoan("Gita", "2026-10-30"),
          tempoan("Hana", "2026-11-09"), // belum jatuh tempo
        ],
      }),
    );
    expect(kunci(hasil)).toEqual([
      "belum-harian",
      "belum-mingguan",
      "belum-tempo-sekarang",
      "belum-tempo-lewat",
    ]);
    const [harian, mingguan, sekarang, lewat] = hasil;
    expect(harian?.judul).toBe("Nasabah harian yang belum ditagih: 2");
    expect(harian?.nasabah.map((n) => [n.nama, n.keterangan])).toEqual([
      ["Ani", "Rp 50.000"],
      ["Budi", "Macet · Rp 50.000"],
    ]);
    expect(harian?.jenisPinjaman).toBe("harian");
    expect(mingguan?.judul).toBe("Nasabah mingguan yang belum ditagih: 1");
    expect(mingguan?.nasabah[0]?.keterangan).toBe("Rp 150.000");
    expect(sekarang?.judul).toBe("Nasabah tempoan jatuh tempo sekarang: 1");
    expect(sekarang?.nasabah[0]?.keterangan).toBe("Rp 1.250.000");
    expect(lewat?.judul).toBe("Nasabah tempoan lewat jatuh tempo: 1");
    expect(lewat?.nada).toBe("merah");
    expect(lewat?.nasabah[0]?.keterangan).toBe("Lewat 3 hari · Rp 1.250.000");
    expect(jumlahTindakan(hasil)).toBe(4);
  });

  test("tempoan jatuh tempo besok: kabar sehari lebih awal, tak dihitung lonceng", () => {
    const hasil = susunPengingat(
      bahan({ pinjaman: [tempoan("Indah", "2026-11-03")], gerbangMutasi: "siap" }),
    );
    expect(kunci(hasil)).toEqual(["tempo-besok", "mutasi-siap"]);
    expect(hasil[0]).toMatchObject({
      judul: "Nasabah tempoan jatuh tempo besok: 1",
      tindakan: false,
    });
    expect(jumlahTindakan(hasil)).toBe(1);
  });

  test("tempoan yang sudah diliburkan hari ini tak lagi menahan", () => {
    const hasil = susunPengingat(
      bahan({
        pinjaman: [
          tempoan("Joko", "2026-10-30", { hariIni: { jenis: "libur", alasan: "belum ada uang" } }),
        ],
        gerbangMutasi: "siap",
      }),
    );
    expect(kunci(hasil)).toEqual(["mutasi-siap"]);
  });

  test("belum punya nasabah: kabar tanpa ajakan membuka Mutasi", () => {
    const hasil = susunPengingat(bahan({ gerbangMutasi: "belum-ada-nasabah" }));
    expect(kunci(hasil)).toEqual(["tanpa-nasabah"]);
    expect(jumlahTindakan(hasil)).toBe(0);
  });

  test("daftar tagih belum dimuat: tak ada rincian maupun ajakan", () => {
    expect(susunPengingat(bahan({ pinjaman: null, gerbangMutasi: "memuat" }))).toEqual([]);
  });

  test("laporan dibuka: serahkan tunai; kas diterima: hasilnya, tanpa tindakan", () => {
    const tutup = { buka: false, perluAbsen: false, judul: "Laporan sudah dibuka" };
    const laporan = susunPengingat(
      bahan({
        gerbang: tutup,
        gerbangMutasi: "siap",
        laporanJam: "15.20",
        tunaiSeharusnya: 1_250_000,
      }),
    );
    expect(laporan).toEqual([
      expect.objectContaining({
        kunci: "laporan",
        judul: "Laporan dibuka pukul 15.20",
        isi: "Serahkan tunai Rp 1.250.000 ke kasir.",
        tindakan: true,
      }),
    ]);
    const diterima = susunPengingat(
      bahan({
        gerbang: tutup,
        gerbangMutasi: "siap",
        laporanJam: "15.20",
        serahTerima: { tunaiDiterima: 1_200_000, selisihSetor: -50_000 },
      }),
    );
    expect(diterima).toEqual([
      expect.objectContaining({
        kunci: "kas-diterima",
        nada: "merah",
        judul: "Kas diterima — tekor Rp 50.000",
        tindakan: false,
      }),
    ]);
  });
});
