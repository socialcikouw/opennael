import { describe, expect, test } from "bun:test";
import { buatSesi, type PenyimpanSesi, type Sesi } from "./sesi";

const sesiContoh = { tokenAkses: "a", tokenSegar: "s", pengguna: {} } as unknown as Sesi;

describe("sesi klien", () => {
  test("penyimpan sinkron (web): sesi langsung tersedia; simpan, ganti token, hapus, dengar", async () => {
    const tersimpan: (Sesi | null)[] = [];
    const penyimpan: PenyimpanSesi = {
      bacaSinkron: () => sesiContoh,
      tulis: (s) => {
        tersimpan.push(s);
      },
    };
    const sesi = buatSesi(penyimpan);
    expect(sesi.ambil()).toBe(sesiContoh);

    let diumumkan = 0;
    const berhenti = sesi.dengar(() => diumumkan++);
    await sesi.gantiToken({ tokenAkses: "a2", tokenSegar: "s2" });
    expect(sesi.ambil()).toMatchObject({ tokenAkses: "a2", tokenSegar: "s2" });
    await sesi.hapus();
    expect(sesi.ambil()).toBeNull();
    expect(tersimpan.map((s) => s?.tokenAkses ?? null)).toEqual(["a2", null]);
    expect(diumumkan).toBe(2);

    berhenti();
    await sesi.simpan(sesiContoh);
    expect(diumumkan).toBe(2);
  });

  test("penyimpan asinkron (HP): undefined sampai muat(); galat baca = belum masuk", async () => {
    const sesi = buatSesi({ baca: async () => sesiContoh, tulis: async () => {} });
    expect(sesi.ambil()).toBeUndefined();
    await sesi.muat();
    expect(sesi.ambil()).toBe(sesiContoh);

    const rusak = buatSesi({
      baca: async () => {
        throw new Error("brankas rusak");
      },
      tulis: async () => {},
    });
    await rusak.muat();
    expect(rusak.ambil()).toBeNull();
  });

  test("gantiToken tanpa sesi tidak membuat sesi", async () => {
    const sesi = buatSesi({ bacaSinkron: () => null, tulis: () => {} });
    await sesi.gantiToken({ tokenAkses: "x", tokenSegar: "y" });
    expect(sesi.ambil()).toBeNull();
  });

  test("perubahan dari luar (tab lain) ikut terbaca", () => {
    let kabari: (s: Sesi | null) => void = () => {};
    const sesi = buatSesi({
      bacaSinkron: () => sesiContoh,
      tulis: () => {},
      pantau: (ubah) => {
        kabari = ubah;
        return () => {};
      },
    });
    kabari(null);
    expect(sesi.ambil()).toBeNull();
  });
});
