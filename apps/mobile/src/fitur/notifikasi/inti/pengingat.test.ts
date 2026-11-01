import { describe, expect, test } from "bun:test";
import { jumlahTindakan, type Pengingat, susunPengingat } from "./pengingat";

const BUKA = { buka: true, perluAbsen: false };
const jenisnya = (p: Pengingat[]) => p.map((x) => x.jenis);

describe("susunPengingat", () => {
  test("belum absen: satu pengingat yang menunggu tindakan", () => {
    const hasil = susunPengingat({ gerbang: { buka: false, perluAbsen: true }, belum: null });
    expect(hasil).toEqual([
      {
        jenis: "absen",
        judul: "Belum absen",
        isi: "Absen pagi dulu supaya transaksi hari ini bisa dicatat.",
        tindakan: true,
      },
    ]);
  });

  test("gerbang tertutup: kabar saja, tanpa tindakan", () => {
    const hasil = susunPengingat({
      gerbang: { buka: false, perluAbsen: false, judul: "Libur kantor", isi: "Natal" },
      belum: ["Ani"],
    });
    expect(hasil).toEqual([
      { jenis: "gerbang", judul: "Libur kantor", isi: "Natal", tindakan: false },
    ]);
    // Lapangan tutup: sisa tagihan tak diributkan.
    expect(jumlahTindakan(hasil)).toBe(0);
  });

  test("gerbang tertutup tanpa isi: isi null", () => {
    const [p] = susunPengingat({
      gerbang: { buka: false, perluAbsen: false, judul: "Laporan sudah dibuka" },
      belum: [],
    });
    expect(p?.isi).toBeNull();
  });

  test("lapangan terbuka, masih ada yang belum dicatat: nama diringkas tiga", () => {
    const sedikit = susunPengingat({ gerbang: BUKA, belum: ["Ani", "Budi"] });
    expect(sedikit).toEqual([
      {
        jenis: "belum",
        judul: "Masih 2 nasabah belum dicatat",
        isi: "Ani, Budi — catat setoran atau libur dulu, baru laporan bisa dibuka.",
        tindakan: true,
      },
    ]);
    const banyak = susunPengingat({ gerbang: BUKA, belum: ["A", "B", "C", "D", "E"] });
    expect(banyak[0]?.judul).toBe("Masih 5 nasabah belum dicatat");
    expect(banyak[0]?.isi).toStartWith("A, B, C, … — catat");
    // Tepat tiga: tanpa "…".
    expect(susunPengingat({ gerbang: BUKA, belum: ["A", "B", "C"] })[0]?.isi).toStartWith(
      "A, B, C — catat",
    );
  });

  test("semua tercatat: laporan siap dibuka", () => {
    const hasil = susunPengingat({ gerbang: BUKA, belum: [] });
    expect(jenisnya(hasil)).toEqual(["laporan"]);
    expect(jumlahTindakan(hasil)).toBe(1);
  });

  test("daftar tagih belum dimuat: tak ada pengingat tagihan", () => {
    expect(susunPengingat({ gerbang: BUKA, belum: null })).toEqual([]);
  });

  test("jumlahTindakan hanya menghitung yang menunggu tindakan", () => {
    const campur: Pengingat[] = [
      { jenis: "gerbang", judul: "a", isi: null, tindakan: false },
      { jenis: "belum", judul: "b", isi: null, tindakan: true },
      { jenis: "absen", judul: "c", isi: null, tindakan: true },
    ];
    expect(jumlahTindakan(campur)).toBe(2);
    expect(jumlahTindakan([])).toBe(0);
  });
});
