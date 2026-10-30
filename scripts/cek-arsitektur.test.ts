import { describe, expect, test } from "bun:test";
import {
  klasifikasiApi,
  periksaImporApi,
  periksaSemua,
  periksaTulis,
  temukanSiklus,
} from "./cek-arsitektur";
import { IMPOR_KONTEKS_BOLEH, PEMILIK_TABEL } from "./kepemilikan-tabel";

const graf = (...tepi: [string, string][]) => {
  const g = new Map<string, Set<string>>();
  for (const [a, b] of tepi) g.set(a, (g.get(a) ?? new Set()).add(b));
  return g;
};

describe("temukanSiklus", () => {
  test("graf tanpa siklus", () => {
    expect(temukanSiklus(graf(["a", "b"], ["b", "c"], ["a", "c"]))).toEqual([]);
  });
  test("siklus dua simpul dilaporkan sekali, mulai dari simpul terkecil", () => {
    expect(temukanSiklus(graf(["b", "a"], ["a", "b"]))).toEqual([["a", "b"]]);
  });
  test("siklus tiga simpul", () => {
    expect(temukanSiklus(graf(["x", "y"], ["y", "z"], ["z", "x"]))).toEqual([["x", "y", "z"]]);
  });
});

describe("klasifikasiApi", () => {
  test("modul, platform, akar", () => {
    expect(klasifikasiApi("modul/kantor/index")).toEqual({ konteks: "kantor", indeks: true });
    expect(klasifikasiApi("modul/kantor")).toEqual({ konteks: "kantor", indeks: true });
    expect(klasifikasiApi("modul/kantor/wilayah/layanan")).toEqual({
      konteks: "kantor",
      indeks: false,
    });
    expect(klasifikasiApi("platform/http/openapi").konteks).toBe("platform");
    expect(klasifikasiApi("app")).toEqual({ konteks: "akar", berkasAkar: "app", indeks: false });
  });
});

describe("periksaImporApi", () => {
  test("platform tidak mengimpor modul atau berkas akar", () => {
    expect(periksaImporApi("platform/http/x", "modul/kantor/index", false)).toContain("platform/");
    expect(periksaImporApi("platform/http/x", "app", false)).toContain("app.ts");
    expect(periksaImporApi("platform/http/x", "platform/db/klien", false)).toBeNull();
  });
  test("modul tidak mengimpor app/server/jadwal, kecuali berkas uji", () => {
    expect(periksaImporApi("modul/kas/rute", "app", false)).toContain("app.ts");
    expect(periksaImporApi("modul/kas/rute.test", "app", true)).toBeNull();
  });
  test("antar-konteks harus lewat index.ts", () => {
    expect(periksaImporApi("modul/kas/layanan", "modul/kantor/wilayah/layanan", false)).toContain(
      "index.ts",
    );
    expect(periksaImporApi("modul/kas/layanan", "modul/kantor/index", false)).toBeNull();
  });
  test("panah yang tidak tercatat ditolak", () => {
    expect(periksaImporApi("modul/kantor/x", "modul/kas/index", false)).toContain("belum boleh");
    expect(periksaImporApi("modul/kas/x", "modul/pembiayaan/index", false)).toContain(
      "belum boleh",
    );
    expect(periksaImporApi("modul/pembiayaan/x", "modul/hari-kolektor/index", false)).toBeNull();
  });
  test("app.ts dan jadwal.ts boleh memasang semua konteks", () => {
    expect(periksaImporApi("app", "modul/kas/index", false)).toBeNull();
  });
  test("konteks sendiri bebas", () => {
    expect(periksaImporApi("modul/kas/a", "modul/kas/b/c", false)).toBeNull();
  });
});

describe("periksaTulis", () => {
  test("pemilik boleh, bukan pemilik tidak", () => {
    expect(periksaTulis("modul/pembiayaan/pinjaman/layanan.ts", "pinjaman")).toBeNull();
    expect(periksaTulis("modul/kas/buku/layanan.ts", "pinjaman")).toContain("milik");
  });
  test("pengecualian tercatat hanya untuk berkas dan tabel yang tertulis", () => {
    expect(periksaTulis("modul/kantor/wilayah/layanan.ts", "nasabah")).toBeNull();
    expect(periksaTulis("modul/kantor/wilayah/layanan.ts", "transaksi")).toContain("milik");
    expect(periksaTulis("modul/kantor/lain.ts", "nasabah")).toContain("milik");
  });
  test("tabel tanpa pemilik ditolak", () => {
    expect(periksaTulis("modul/kas/x.ts", "tabel_baru")).toContain("belum punya pemilik");
  });
  test("tabel platform hanya ditulis dari platform/", () => {
    expect(periksaTulis("platform/riwayat/catat.ts", "riwayat_perubahan")).toBeNull();
    expect(periksaTulis("modul/kas/x.ts", "riwayat_perubahan")).toContain("milik");
  });
});

describe("data kepemilikan", () => {
  test("setiap pemilik tabel adalah konteks yang dikenal atau platform", () => {
    const dikenal = new Set([...Object.keys(IMPOR_KONTEKS_BOLEH), "platform"]);
    for (const [tabel, pemilik] of Object.entries(PEMILIK_TABEL)) {
      expect(dikenal.has(pemilik), `${tabel} → ${pemilik}`).toBe(true);
    }
  });
  test("panah yang dibolehkan menuju konteks yang dikenal dan tanpa siklus", () => {
    const g = new Map<string, Set<string>>();
    for (const [dari, ke] of Object.entries(IMPOR_KONTEKS_BOLEH)) {
      for (const k of ke) expect(k in IMPOR_KONTEKS_BOLEH, `${dari} → ${k}`).toBe(true);
      g.set(dari, new Set(ke));
    }
    expect(temukanSiklus(g)).toEqual([]);
  });
});

describe("repo saat ini", () => {
  // Memindai seluruh repo: di CI/klon baru (cache dingin) bisa >5 dtk, batas bawaan bun test.
  test("tidak ada pelanggaran arsitektur", () => {
    expect(periksaSemua()).toEqual([]);
  }, 60_000);
});
