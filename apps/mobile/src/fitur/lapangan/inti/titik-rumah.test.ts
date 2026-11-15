import { describe, expect, test } from "bun:test";
import {
  AKURASI_MAKS_METER,
  pilihNamaDesa,
  pilihTitikTerbaik,
  susunAlamat,
  tingkatAkurasi,
  titikRumahDari,
} from "./titik-rumah";

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

describe("pilihNamaDesa", () => {
  const alamat = (district: string | null, city: string | null, subregion: string | null) => ({
    district,
    city,
    subregion,
  });

  test("desa/kelurahan (district) didahulukan, lalu kota/kecamatan, lalu kabupaten", () => {
    expect(pilihNamaDesa([alamat("Pule", "Kedungwaru", "Tulungagung")])).toBe("Pule");
    expect(pilihNamaDesa([alamat(null, "Kedungwaru", "Tulungagung")])).toBe("Kedungwaru");
    expect(pilihNamaDesa([alamat(null, null, "Tulungagung")])).toBe("Tulungagung");
  });

  test("isian kosong atau spasi dilewati; spasi ganda dirapikan", () => {
    expect(pilihNamaDesa([alamat("  ", "Kedungwaru", null)])).toBe("Kedungwaru");
    expect(pilihNamaDesa([alamat("  Desa   Pule ", null, null)])).toBe("Desa Pule");
  });

  test("tak ada yang terisi → null", () => {
    expect(pilihNamaDesa([])).toBeNull();
    expect(pilihNamaDesa([alamat(null, null, null)])).toBeNull();
  });

  test("beberapa alamat: district pertama yang terisi menang atas city alamat sebelumnya", () => {
    expect(pilihNamaDesa([alamat(null, "Kota", null), alamat("Pule", null, null)])).toBe("Pule");
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

  test("alamat lengkap: jalan + nomor, desa & kecamatan, kabupaten & provinsi & kode pos", () => {
    expect(susunAlamat([penuh])).toEqual({
      desa: "Pule",
      baris: ["Jl. Mawar No. 5", "Pule, Kedungwaru", "Tulungagung, Jawa Timur 66229"],
    });
  });

  test("tanpa jalan (umum di desa): hanya dua baris wilayah", () => {
    const { street, streetNumber, ...tanpaJalan } = penuh;
    expect(susunAlamat([tanpaJalan])?.baris).toEqual([
      "Pule, Kedungwaru",
      "Tulungagung, Jawa Timur 66229",
    ]);
  });

  test("nama yang berulang dibuang (kota sama dengan kabupaten) tanpa memedulikan huruf besar", () => {
    const hasil = susunAlamat([
      { ...penuh, city: "TULUNGAGUNG", street: null, streetNumber: null },
    ]);
    expect(hasil?.baris).toEqual(["Pule, TULUNGAGUNG", "Jawa Timur 66229"]);
  });

  test("Plus Code dan 'Unnamed Road' bukan nama jalan", () => {
    expect(susunAlamat([{ ...penuh, street: "7C6F+XX9" }])?.baris[0]).toBe("Pule, Kedungwaru");
    expect(susunAlamat([{ ...penuh, street: "Unnamed Road" }])?.baris[0]).toBe("Pule, Kedungwaru");
  });

  test("nomor yang sudah ada di nama jalan tak diulang; nomor tanpa jalan diabaikan", () => {
    expect(susunAlamat([{ ...penuh, street: "Jl. Mawar 5" }])?.baris[0]).toBe("Jl. Mawar 5");
    expect(susunAlamat([{ ...penuh, street: null }])?.baris[0]).toBe("Pule, Kedungwaru");
  });

  test("kode pos tanpa daerah tak ditampilkan sendirian; tak ada nama wilayah → null", () => {
    expect(
      susunAlamat([{ district: "Pule", city: null, subregion: null, postalCode: "66229" }])?.baris,
    ).toEqual(["Pule"]);
    expect(susunAlamat([{ district: null, city: null, subregion: null }])).toBeNull();
    expect(susunAlamat([])).toBeNull();
  });
});

describe("tingkatAkurasi", () => {
  test("≤ 20 m akurat, ≤ 50 m cukup, di atasnya kasar", () => {
    expect(tingkatAkurasi(5)).toEqual({ teks: "Akurat", warna: "hijau" });
    expect(tingkatAkurasi(20).warna).toBe("hijau");
    expect(tingkatAkurasi(21)).toEqual({ teks: "Cukup Akurat", warna: "kuning" });
    expect(tingkatAkurasi(50).warna).toBe("kuning");
    expect(tingkatAkurasi(51)).toEqual({ teks: "Kasar", warna: "abu" });
  });
});
