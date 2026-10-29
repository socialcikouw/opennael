import { describe, expect, test } from "bun:test";
import { type BarisRem, gabungRem } from "./rem";

const KOLEKTOR = "kolektor-1";
const NASABAH = "nasabah-1";

const baris = (isi: Partial<BarisRem>): BarisRem => ({
  kolektorId: null,
  nasabahId: null,
  pinjamanBaru: false,
  naik: false,
  gulung: false,
  alasan: null,
  ...isi,
});

describe("rem bos yang berlaku (schema-kebijakan)", () => {
  test("tanpa lapis kebijakan: tidak ada yang dikunci", () => {
    const rem = gabungRem([], { kolektorId: KOLEKTOR, nasabahId: null });
    expect(rem.pinjamanBaru).toBe(false);
    expect(rem.naik).toBe(false);
    expect(rem.gulung).toBe(false);
    expect(rem.alasan("naik")).toBeNull();
  });

  test("satu lapis yang mengunci cukup: kantor, kolektor, atau nasabah", () => {
    const sasaran = { kolektorId: KOLEKTOR, nasabahId: NASABAH };
    expect(gabungRem([baris({ naik: true })], sasaran).naik).toBe(true);
    expect(gabungRem([baris({ kolektorId: KOLEKTOR, gulung: true })], sasaran).gulung).toBe(true);
    expect(gabungRem([baris({ nasabahId: NASABAH, naik: true })], sasaran).naik).toBe(true);
  });

  test("lapis kolektor/nasabah lain tidak ikut berlaku", () => {
    const rem = gabungRem(
      [
        baris({ kolektorId: "kolektor-lain", naik: true }),
        baris({ nasabahId: "nasabah-lain", gulung: true }),
      ],
      { kolektorId: KOLEKTOR, nasabahId: NASABAH },
    );
    expect(rem.naik).toBe(false);
    expect(rem.gulung).toBe(false);
  });

  test("lapis nasabah tak punya saklar pinjaman baru (blokir yang mengurusnya)", () => {
    const sasaran = { kolektorId: KOLEKTOR, nasabahId: NASABAH };
    expect(
      gabungRem([baris({ nasabahId: NASABAH, pinjamanBaru: true })], sasaran).pinjamanBaru,
    ).toBe(false);
    expect(gabungRem([baris({ pinjamanBaru: true })], sasaran).pinjamanBaru).toBe(true);
  });

  test("lapis nasabah hanya berlaku bila sasarannya menyebut nasabah", () => {
    const rem = gabungRem([baris({ nasabahId: NASABAH, naik: true })], {
      kolektorId: KOLEKTOR,
      nasabahId: null,
    });
    expect(rem.naik).toBe(false);
  });

  test("alasan diambil dari lapis paling spesifik yang mengunci saklar itu", () => {
    const rem = gabungRem(
      [
        baris({ naik: true, alasan: "kantor" }),
        baris({ kolektorId: KOLEKTOR, naik: true, alasan: "kolektor" }),
        baris({ nasabahId: NASABAH, naik: true, alasan: "nasabah" }),
        baris({ kolektorId: KOLEKTOR, gulung: true, alasan: "gulung kolektor" }),
      ],
      { kolektorId: KOLEKTOR, nasabahId: NASABAH },
    );
    expect(rem.alasan("naik")).toBe("nasabah");
    expect(rem.alasan("gulung")).toBe("gulung kolektor");
    expect(rem.alasan("pinjamanBaru")).toBeNull();
  });
});
