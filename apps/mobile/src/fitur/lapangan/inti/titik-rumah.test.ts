import { describe, expect, test } from "bun:test";
import { AKURASI_MAKS_METER, pilihTitikTerbaik, susunAlamat, titikRumahDari } from "./titik-rumah";

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

describe("pilihTitikTerbaik", () => {
  test("pembacaan pertama yang sah menjadi titik terbaik", () => {
    expect(pilihTitikTerbaik(null, { ...JAKARTA, accuracy: 40 })).toEqual({
      ...JAKARTA,
      akurasiMeter: 40,
    });
  });

  test("pembacaan lebih akurat menggantikan; yang sama atau lebih kasar tidak", () => {
    const lama = { ...JAKARTA, akurasiMeter: 30 };
    expect(pilihTitikTerbaik(lama, { ...JAKARTA, accuracy: 12 })?.akurasiMeter).toBe(12);
    expect(pilihTitikTerbaik(lama, { ...JAKARTA, accuracy: 30 })).toBe(lama);
    expect(pilihTitikTerbaik(lama, { ...JAKARTA, accuracy: 55 })).toBe(lama);
  });

  test("pembacaan tak sah dilewati: titik terbaik tetap (atau tetap kosong)", () => {
    const lama = { ...JAKARTA, akurasiMeter: 80 };
    expect(pilihTitikTerbaik(lama, { ...JAKARTA, accuracy: null })).toBe(lama);
    expect(pilihTitikTerbaik(lama, { latitude: 0, longitude: 0, accuracy: 5 })).toBe(lama);
    expect(pilihTitikTerbaik(null, { ...JAKARTA, accuracy: AKURASI_MAKS_METER + 1 })).toBeNull();
  });
});

describe("susunAlamat", () => {
  const penuh = {
    street: "Jl. Mawar",
    streetNumber: "5",
    district: "Pule",
    city: "Kedungwaru",
    subregion: "Tulungagung",
    region: "Jawa Timur",
    postalCode: "66229",
  };
  const tanpaJalan = { ...penuh, street: null, streetNumber: null };

  test("alamat lengkap: jalan + nomor, desa & kecamatan, kabupaten & provinsi & kode pos", () => {
    expect(susunAlamat([penuh])).toEqual([
      "Jl. Mawar No. 5",
      "Pule, Kedungwaru",
      "Tulungagung, Jawa Timur 66229",
    ]);
  });

  test("tanpa jalan (umum di desa): hanya dua baris wilayah", () => {
    expect(susunAlamat([tanpaJalan])).toEqual([
      "Pule, Kedungwaru",
      "Tulungagung, Jawa Timur 66229",
    ]);
  });

  test("nama yang berulang dibuang (kota sama dengan kabupaten) tanpa memedulikan huruf besar", () => {
    expect(susunAlamat([{ ...tanpaJalan, city: "TULUNGAGUNG" }])).toEqual([
      "Pule, TULUNGAGUNG",
      "Jawa Timur 66229",
    ]);
  });

  test("Plus Code dan 'Unnamed Road' bukan nama jalan", () => {
    expect(susunAlamat([{ ...penuh, street: "7C6F+XX9" }])?.[0]).toBe("Pule, Kedungwaru");
    expect(susunAlamat([{ ...penuh, street: "Unnamed Road" }])?.[0]).toBe("Pule, Kedungwaru");
  });

  test("nomor yang sudah ada di nama jalan tak diulang; nomor tanpa jalan diabaikan", () => {
    expect(susunAlamat([{ ...penuh, street: "Jl. Mawar 5" }])?.[0]).toBe("Jl. Mawar 5");
    expect(susunAlamat([{ ...penuh, street: null }])?.[0]).toBe("Pule, Kedungwaru");
  });

  test("isian kosong atau spasi dilewati; spasi ganda dirapikan", () => {
    expect(susunAlamat([{ district: "  ", city: "Kedungwaru", subregion: null }])).toEqual([
      "Kedungwaru",
    ]);
    expect(susunAlamat([{ district: "  Desa   Pule ", city: null, subregion: null }])).toEqual([
      "Desa Pule",
    ]);
  });

  test("kabupaten saja (desa & kecamatan tak diketahui) tetap menjadi satu baris", () => {
    expect(susunAlamat([{ district: null, city: null, subregion: "Tulungagung" }])).toEqual([
      "Tulungagung",
    ]);
  });

  test("kode pos tanpa daerah tak tampil sendirian; tak ada isian sama sekali → null", () => {
    expect(
      susunAlamat([{ district: "Pule", city: null, subregion: null, postalCode: "66229" }]),
    ).toEqual(["Pule"]);
    expect(susunAlamat([{ district: null, city: null, subregion: null }])).toBeNull();
    expect(susunAlamat([])).toBeNull();
  });

  test("beberapa alamat: tiap tingkat diambil dari alamat pertama yang mengisinya", () => {
    expect(
      susunAlamat([
        { district: null, city: "Kota", subregion: null },
        { district: "Pule", city: null, subregion: "Tulungagung" },
      ]),
    ).toEqual(["Pule, Kota", "Tulungagung"]);
  });
});
