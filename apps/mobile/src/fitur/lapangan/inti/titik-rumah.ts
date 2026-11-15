/**
 * TITIK RUMAH dari GPS HP — memeriksa titik sebelum dikirim ke
 * `PUT /nasabah/:id/lokasi` (batas yang sama dengan `lokasiRumahSchema`:
 * lintang −11…6, bujur 95…141, akurasi bulat ≥ 1 m). Tanpa I/O.
 */

export interface TitikRumah {
  latitude: number;
  longitude: number;
  akurasiMeter: number;
}

/** Titik yang galatnya lebih dari ini (meter) tak berguna menemukan rumah — tunggu GPS membaik. */
export const AKURASI_MAKS_METER = 100;

/** Titik sudah sebaik yang dibutuhkan (meter) — pemantau GPS latar berhenti di sini (hemat baterai). */
export const AKURASI_CUKUP_METER = 20;

export function titikRumahDari(posisi: {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}): TitikRumah {
  if (posisi.accuracy === null || !Number.isFinite(posisi.accuracy)) {
    throw new Error(
      "Akurasi GPS belum diketahui. Tunggu sebentar di tempat terbuka, lalu coba lagi.",
    );
  }
  const akurasiMeter = Math.max(1, Math.round(posisi.accuracy));
  if (akurasiMeter > AKURASI_MAKS_METER) {
    throw new Error(
      `GPS masih kurang akurat (±${akurasiMeter} m). Tunggu sebentar di tempat terbuka, lalu coba lagi.`,
    );
  }
  const { latitude, longitude } = posisi;
  if (latitude < -11 || latitude > 6 || longitude < 95 || longitude > 141) {
    throw new Error("Titik GPS di luar wilayah Indonesia — periksa pengaturan lokasi HP.");
  }
  return { latitude, longitude, akurasiMeter };
}

/**
 * Pemantau GPS latar: dari titik terbaik sejauh ini (`terbaik`) dan pembacaan baru
 * (`posisi`), kembalikan yang lebih akurat. Pembacaan yang tak sah (akurasi > 100 m,
 * tak diketahui, di luar Indonesia) dilewati. Objek `terbaik` yang sama dikembalikan
 * bila tak ada yang lebih baik — pemanggil cukup membandingkan dengan `===`.
 */
export function pilihTitikTerbaik(
  terbaik: TitikRumah | null,
  posisi: { latitude: number; longitude: number; accuracy: number | null },
): TitikRumah | null {
  let calon: TitikRumah;
  try {
    calon = titikRumahDari(posisi);
  } catch {
    return terbaik;
  }
  return terbaik && terbaik.akurasiMeter <= calon.akurasiMeter ? terbaik : calon;
}
