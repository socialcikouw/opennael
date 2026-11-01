import { describe, expect, test } from "bun:test";
import type { KartuTagih } from "@opennael/contracts";
import { belumDicatat } from "./belum-dicatat";

const T = "2026-11-01";

type Bahan = Pick<KartuTagih, "jenis" | "tanggalAkad" | "jatuhTempo" | "hariIni"> & {
  nama: string;
};
const kartu = (
  nama: string,
  jenis: Bahan["jenis"],
  tanggalAkad: string,
  hariIni: Bahan["hariIni"] = null,
  jatuhTempo: string | null = null,
): Bahan => ({ nama, jenis, tanggalAkad, hariIni, jatuhTempo });

describe("belumDicatat (B6 + C6)", () => {
  test("harian yang sudah mulai ditagih dan belum dicatat apa pun", () => {
    const hasil = belumDicatat([kartu("Ani", "harian", "2026-10-20")], T);
    expect(hasil.map((p) => p.nama)).toEqual(["Ani"]);
  });

  test("akad hari ini belum wajib (B1)", () => {
    expect(belumDicatat([kartu("Baru", "harian", T)], T)).toEqual([]);
  });

  test("yang sudah bayar atau libur hari ini tidak termasuk", () => {
    const hasil = belumDicatat(
      [
        kartu("Bayar", "harian", "2026-10-20", { jenis: "angsuran", storting: 50_000 }),
        kartu("Libur", "harian", "2026-10-20", { jenis: "libur", alasan: null }),
        kartu("Belum", "harian", "2026-10-20"),
      ],
      T,
    );
    expect(hasil.map((p) => p.nama)).toEqual(["Belum"]);
  });

  test("mingguan hanya pada hari tagihnya; tempoan sejak jatuh tempo", () => {
    const hasil = belumDicatat(
      [
        kartu("Tepat", "mingguan", "2026-10-25"), // akad + 7 hari = hari ini
        kartu("Lain", "mingguan", "2026-10-26"), // hari tagihnya besok
        kartu("Nanti", "tempoan", "2026-10-25", null, "2026-11-08"),
        kartu("Tempo", "tempoan", "2026-10-18", null, T), // jatuh tempo hari ini
        kartu("Lewat", "tempoan", "2026-10-11", null, "2026-10-25"),
        kartu(
          "Libur",
          "tempoan",
          "2026-10-11",
          { jenis: "libur", alasan: "belum ada uang" },
          "2026-10-25",
        ),
      ],
      T,
    );
    expect(hasil.map((p) => p.nama)).toEqual(["Tepat", "Tempo", "Lewat"]);
  });

  test("urutan masukan dipertahankan", () => {
    const hasil = belumDicatat(
      [
        kartu("C", "harian", "2026-10-01"),
        kartu("A", "harian", "2026-10-02"),
        kartu("B", "harian", "2026-10-03"),
      ],
      T,
    );
    expect(hasil.map((p) => p.nama)).toEqual(["C", "A", "B"]);
  });
});
