import { describe, expect, test } from "bun:test";
import { AKURASI_MAKS_METER, titikRumahDari } from "./titik-rumah";

const JAKARTA = { latitude: -6.2, longitude: 106.8166 };

describe("titikRumahDari", () => {
  test("titik sah: akurasi dibulatkan ke meter bulat", () => {
    expect(titikRumahDari({ ...JAKARTA, accuracy: 12.4 })).toEqual({
      ...JAKARTA,
      akurasiMeter: 12,
    });
    expect(titikRumahDari({ ...JAKARTA, accuracy: 12.5 })).toEqual({
      ...JAKARTA,
      akurasiMeter: 13,
    });
  });

  test("akurasi di bawah 1 m dinaikkan ke 1 (server mewajibkan positif)", () => {
    expect(titikRumahDari({ ...JAKARTA, accuracy: 0.2 }).akurasiMeter).toBe(1);
  });

  test("batas akurasi: tepat batas lolos, di atasnya ditolak", () => {
    expect(titikRumahDari({ ...JAKARTA, accuracy: AKURASI_MAKS_METER }).akurasiMeter).toBe(
      AKURASI_MAKS_METER,
    );
    expect(() => titikRumahDari({ ...JAKARTA, accuracy: AKURASI_MAKS_METER + 1 })).toThrow(
      "kurang akurat",
    );
  });

  test("akurasi tak diketahui ditolak", () => {
    expect(() => titikRumahDari({ ...JAKARTA, accuracy: null })).toThrow("belum diketahui");
    expect(() => titikRumahDari({ ...JAKARTA, accuracy: Number.NaN })).toThrow("belum diketahui");
  });

  test("di luar wilayah Indonesia ditolak (batas sama dengan kontrak)", () => {
    for (const [latitude, longitude] of [
      [-11.01, 110],
      [6.01, 110],
      [0, 94.99],
      [0, 141.01],
      [0, 0],
    ] as const) {
      expect(() => titikRumahDari({ latitude, longitude, accuracy: 10 })).toThrow("luar wilayah");
    }
  });

  test("tepi wilayah masih sah", () => {
    expect(titikRumahDari({ latitude: -11, longitude: 95, accuracy: 10 }).latitude).toBe(-11);
    expect(titikRumahDari({ latitude: 6, longitude: 141, accuracy: 10 }).longitude).toBe(141);
  });
});
