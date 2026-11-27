import { afterEach, describe, expect, test } from "bun:test";
import { modeTerpasang } from "./mode";
import {
  ambilPermintaanMode,
  beralihMode,
  type Pengarah,
  pasangPengarah,
  selesaiBeralih,
} from "./transisi-mode";

function pengarahPalsu() {
  const jejak: string[] = [];
  const p: Pengarah = {
    pindah: (ke) => jejak.push(`pindah ${ke}`),
    gantiMode: (ke) => jejak.push(`ganti ${ke}`),
  };
  return { p, jejak };
}

const lepas: (() => void)[] = [];
afterEach(() => {
  const r = ambilPermintaanMode();
  if (r) selesaiBeralih(r.nomor);
  for (const l of lepas.splice(0)) l();
});

describe("beralih mode", () => {
  test("mode yang sama: langsung pindah ke tujuan, tanpa tirai", () => {
    const { p, jejak } = pengarahPalsu();
    lepas.push(pasangPengarah(p), modeTerpasang.pasang("kerja"));
    beralihMode("kerja", "/kolektor/mingguan");
    expect(jejak).toEqual(["pindah /kolektor/mingguan"]);
    expect(ambilPermintaanMode()).toBeNull();
  });

  test("mode berbeda: permintaan untuk tirai, tujuan bawaan = tab pertama mode itu", () => {
    const { p, jejak } = pengarahPalsu();
    lepas.push(pasangPengarah(p), modeTerpasang.pasang("kerja"));
    beralihMode("rekap");
    expect(jejak).toEqual([]);
    expect(ambilPermintaanMode()).toMatchObject({ mode: "rekap", ke: "/kolektor/foto" });
  });

  test("tanpa pengarah (di luar layar kolektor): tidak terjadi apa-apa", () => {
    lepas.push(modeTerpasang.pasang("kerja"));
    beralihMode("akun");
    expect(ambilPermintaanMode()).toBeNull();
  });

  test("selesai hanya menghapus permintaan yang sama (permintaan baru tak terhapus)", () => {
    const { p } = pengarahPalsu();
    lepas.push(pasangPengarah(p), modeTerpasang.pasang("kerja"));
    beralihMode("rekap");
    const pertama = ambilPermintaanMode()?.nomor ?? 0;
    beralihMode("akun");
    selesaiBeralih(pertama);
    expect(ambilPermintaanMode()?.mode).toBe("akun");
  });
});

describe("mode terpasang", () => {
  test("grup baru terpasang sebelum grup lama dilepas: mode tetap grup baru", () => {
    const lepasKerja = modeTerpasang.pasang("kerja");
    const lepasRekap = modeTerpasang.pasang("rekap");
    lepasKerja();
    expect(modeTerpasang.ambil()).toBe("rekap");
    lepasRekap();
    expect(modeTerpasang.ambil()).toBeNull();
  });
});
