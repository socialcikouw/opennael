import { afterEach, describe, expect, test } from "bun:test";
import { modeAktif } from "./mode";
import { ambilPermintaanMode, beralihMode, pasangTirai, selesaiBeralih } from "./transisi-mode";

afterEach(() => {
  const p = ambilPermintaanMode();
  if (p) selesaiBeralih(p.ke);
  modeAktif.ganti("harian");
});

describe("beralih mode", () => {
  test("mode yang sama: tanpa transisi, `lalu` tetap dijalankan", () => {
    let jalan = 0;
    const lepas = pasangTirai();
    beralihMode("harian", () => jalan++);
    expect(ambilPermintaanMode()).toBeNull();
    expect(jalan).toBe(1);
    lepas();
  });

  test("tanpa tirai terpasang: mode langsung berganti lalu `lalu` dijalankan", () => {
    const urutan: string[] = [];
    beralihMode("laporan", () => urutan.push(modeAktif.ambil()));
    expect(modeAktif.ambil()).toBe("laporan");
    expect(urutan).toEqual(["laporan"]);
  });

  test("dengan tirai: mode BELUM berganti — tirai yang menggantinya di balik layar hitam", () => {
    const lepas = pasangTirai();
    beralihMode("tempoan");
    expect(modeAktif.ambil()).toBe("harian");
    expect(ambilPermintaanMode()?.mode).toBe("tempoan");
    lepas();
  });

  test("selesai hanya menghapus permintaan yang sama (permintaan baru tak terhapus)", () => {
    const lepas = pasangTirai();
    beralihMode("mingguan");
    const pertama = ambilPermintaanMode()?.ke ?? 0;
    beralihMode("laporan");
    selesaiBeralih(pertama);
    expect(ambilPermintaanMode()?.mode).toBe("laporan");
    lepas();
  });
});
