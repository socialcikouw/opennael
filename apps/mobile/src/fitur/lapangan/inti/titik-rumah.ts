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

/** Bagian alamat hasil geokode terbalik HP (Android & iOS) yang dipakai untuk menamai tempat. */
export interface AlamatGeokode {
  district: string | null;
  city: string | null;
  subregion: string | null;
  street?: string | null;
  streetNumber?: string | null;
  region?: string | null;
  postalCode?: string | null;
}

/** Plus Code Google ("7C6F+XX") dan nama jalan kosong yang kadang dikirim geokoder sebagai nama jalan. */
const KODE_PLUS = /^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3}/i;
const TANPA_NAMA = /^(unnamed road|jalan tanpa nama)$/i;

function bersih(teks: string | null | undefined): string | null {
  const t = teks?.replace(/\s+/g, " ").trim();
  return t && !KODE_PLUS.test(t) && !TANPA_NAMA.test(t) ? t : null;
}

/**
 * Susun alamat bertingkat dari hasil geokode terbalik — baris yang ditempel di foto:
 * jalan (+ nomor) · desa, kecamatan · kabupaten, provinsi kode pos. Tingkat kosong dan
 * nama yang berulang (kota = kabupaten, dsb.) dibuang; di pedesaan jalan sering tak
 * diketahui, jadi alamat tetap berguna tanpa baris jalan. `null` bila tak ada satu
 * baris pun.
 */
export function susunAlamat(alamat: readonly AlamatGeokode[]): string[] | null {
  const ambil = (bagian: keyof AlamatGeokode) =>
    alamat.map((a) => bersih(a[bagian])).find((t) => t !== null) ?? null;

  const terlihat = new Set<string>();
  const unik = (...bagian: (string | null)[]) =>
    bagian.filter((b): b is string => {
      if (!b || terlihat.has(b.toLowerCase())) return false;
      terlihat.add(b.toLowerCase());
      return true;
    });

  const jalan = ambil("street");
  const nomor = ambil("streetNumber");
  const barisJalan = jalan
    ? nomor && !jalan.includes(nomor)
      ? `${jalan} No. ${nomor}`
      : jalan
    : null;
  const wilayah = unik(ambil("district"), ambil("city"));
  const daerah = unik(ambil("subregion"), ambil("region"));
  const kodePos = ambil("postalCode");

  const baris = [
    barisJalan,
    wilayah.join(", "),
    [daerah.join(", "), daerah.length > 0 ? kodePos : null].filter(Boolean).join(" "),
  ].filter((b): b is string => !!b);
  return baris.length > 0 ? baris : null;
}
