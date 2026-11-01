import { describe, expect, test } from "bun:test";
import { judul, tampilKampung, tampilKeterangan, tampilNama } from "./huruf";

describe("huruf besar-kecil tampilan (docs/tampilan.md)", () => {
  test("nama huruf kecil, kampung HURUF BESAR, keterangan huruf kecil", () => {
    expect(tampilNama(" Budi SANTOSO ")).toBe("budi santoso");
    expect(tampilKampung("pule barat")).toBe("PULE BARAT");
    expect(tampilKeterangan("Ganti Ban Dalam")).toBe("ganti ban dalam");
  });

  test("judul: Kapital Tiap Kata, sisanya utuh (singkatan & merek)", () => {
    expect(judul("bayar angsuran")).toBe("Bayar Angsuran");
    expect(judul("mutasi kas terkunci · 3 belum ditagih")).toBe(
      "Mutasi Kas Terkunci · 3 Belum Ditagih",
    );
    expect(judul("nasabah harian yang belum ditagih: 5")).toBe(
      "Nasabah Harian Yang Belum Ditagih: 5",
    );
    expect(judul("selamat datang di OpenNael")).toBe("Selamat Datang Di OpenNael");
    expect(judul("kas diterima — tekor Rp 50.000")).toBe("Kas Diterima — Tekor Rp 50.000");
    expect(judul("tempoan (jatuh tempo)")).toBe("Tempoan (Jatuh Tempo)");
  });
});
