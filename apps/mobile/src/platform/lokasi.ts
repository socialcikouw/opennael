import * as Location from "expo-location";

/** Titik GPS mentah dari HP; `accuracy` = perkiraan galat dalam meter (kosong bila tak diketahui). */
export interface PosisiGps {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

/**
 * Baca posisi GPS sekarang (izin hanya saat aplikasi dibuka). Galat berbahasa
 * manusia: izin ditolak, GPS mati, atau gagal mendapat titik.
 */
export async function bacaPosisi(): Promise<PosisiGps> {
  const izin = await Location.requestForegroundPermissionsAsync();
  if (izin.status !== "granted") {
    throw new Error("Izin lokasi ditolak. Aktifkan izin lokasi OpenNael di pengaturan HP.");
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error("GPS HP sedang mati. Nyalakan lokasi, lalu coba lagi.");
  }
  try {
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy };
  } catch {
    throw new Error("Titik GPS belum didapat. Coba lagi di tempat terbuka.");
  }
}
