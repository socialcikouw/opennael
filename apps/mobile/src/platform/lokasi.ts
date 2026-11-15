import * as Location from "expo-location";

/** Titik GPS mentah dari HP; `accuracy` = perkiraan galat dalam meter (kosong bila tak diketahui). */
export interface PosisiGps {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

/** Izin lokasi (hanya saat aplikasi dibuka) dan GPS menyala; bila tidak, galat berbahasa manusia. */
async function pastikanLokasiSiap(): Promise<void> {
  const izin = await Location.requestForegroundPermissionsAsync();
  if (izin.status !== "granted") {
    throw new Error("Izin lokasi ditolak. Aktifkan izin lokasi OpenNael di pengaturan HP.");
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error("GPS HP sedang mati. Nyalakan lokasi, lalu coba lagi.");
  }
}

function dariKoordinat(coords: Location.LocationObjectCoords): PosisiGps {
  return { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy };
}

/**
 * Baca posisi GPS sekarang (izin hanya saat aplikasi dibuka). Galat berbahasa
 * manusia: izin ditolak, GPS mati, atau gagal mendapat titik.
 */
export async function bacaPosisi(): Promise<PosisiGps> {
  await pastikanLokasiSiap();
  try {
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return dariKoordinat(coords);
  } catch {
    throw new Error("Titik GPS belum didapat. Coba lagi di tempat terbuka.");
  }
}

/** Bagian alamat dari geokode terbalik HP (tanpa kunci API: pakai layanan bawaan Android / iOS). */
export interface AlamatTitik {
  street: string | null;
  streetNumber: string | null;
  district: string | null;
  city: string | null;
  subregion: string | null;
  region: string | null;
  postalCode: string | null;
}

/**
 * Alamat (jalan, desa, kota, kabupaten, provinsi, kode pos) dari titik GPS — geokode
 * terbalik bawaan HP, butuh internet. Tanpa izin lokasi. Gagal (tanpa sinyal, layanan
 * tak ada) → galat; pemanggil memutuskan diam atau tidak.
 */
export async function cariAlamat(latitude: number, longitude: number): Promise<AlamatTitik[]> {
  const hasil = await Location.reverseGeocodeAsync({ latitude, longitude });
  return hasil.map((a) => ({
    street: a.street,
    streetNumber: a.streetNumber,
    district: a.district,
    city: a.city,
    subregion: a.subregion,
    region: a.region,
    postalCode: a.postalCode,
  }));
}

/**
 * Pantau posisi GPS terus-menerus (latar layar yang sedang dibuka): `onPosisi`
 * dipanggil tiap ada titik baru — GPS yang baru menyala biasanya kasar dulu,
 * lalu makin akurat. Hasilnya fungsi untuk berhenti. Galat sama dengan
 * `bacaPosisi` (izin ditolak, GPS mati).
 */
export async function pantauPosisi(onPosisi: (posisi: PosisiGps) => void): Promise<() => void> {
  await pastikanLokasiSiap();
  const langganan = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 0 },
    ({ coords }) => onPosisi(dariKoordinat(coords)),
  );
  return () => langganan.remove();
}
