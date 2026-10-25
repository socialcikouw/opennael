import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * VARIAN APLIKASI — `APP_VARIANT` disetel per profil di `eas.json`. Satu nama
 * jalur dipakai di mana-mana: profil EAS = channel = branch EAS Update
 * (lihat "Jalur rilis aplikasi HP" di CLAUDE.md).
 *
 * `development` tidak punya varian di sini: aplikasi dibuka di Expo Go
 * (tanpa build, `APP_VARIANT` kosong) dengan JS dari Metro di laptop.
 * `preview`: APK uji pemilik ("Nael Uji"); JS dari EAS Update channel
 * `preview`, API dari variabel EAS lingkungan `preview`.
 *
 * Nama paket SENGAJA berbeda dari APK lapangan aplikasi lama
 * (`com.naelcapital.app`, proyek EAS lain) — terpasang berdampingan, tidak
 * pernah menimpa atau menerima pembaruan OTA milik karyawan.
 *
 * `APP_VARIANT` ikut menentukan sidik jari runtime (`runtimeVersion`
 * fingerprint): `eas update` wajib dijalankan dengan varian yang sama dengan
 * build-nya, kalau tidak update-nya tidak pernah masuk (skrip `update:preview`).
 *
 * Varian produksi belum ditentukan: nama paket & proyek EAS rilis diputuskan
 * saat aplikasi baru menggantikan aplikasi lama.
 */
const VARIAN = {
  preview: { name: "Nael Uji", paket: "com.opennael.app.preview" },
} as const;

export default ({ config }: ConfigContext): ExpoConfig => {
  const varian = process.env.APP_VARIANT;
  if (!varian) return config as ExpoConfig;
  // Varian salah ketik / usang (mis. `development`) jangan diam-diam jatuh ke
  // konfigurasi dasar: sidik jarinya lain, OTA terkirim tapi tak pernah masuk.
  if (!Object.hasOwn(VARIAN, varian)) {
    throw new Error(
      `APP_VARIANT "${varian}" tidak dikenal (yang ada: ${Object.keys(VARIAN).join(", ")}).`,
    );
  }
  const { name, paket } = VARIAN[varian as keyof typeof VARIAN];

  // APK dipakai tanpa laptop: alamat API wajib dari variabel EAS lingkungan
  // varian itu. Tanpa itu `.env` lokal (IP laptop) ikut terbundel diam-diam
  // saat `eas update` dijalankan dari laptop.
  //
  // Diperiksa hanya saat JS dibundel: di mesin EAS Build (`EAS_BUILD`) dan
  // saat `expo export` mode produksi (dipakai `eas update`, yang menyuntik
  // variabel EAS lingkungan `--environment` dan mematikan `.env`). `eas build`
  // di laptop membaca konfigurasi ini dulu tanpa variabel EAS (mencari
  // `projectId`, mode development) — bacaan itu tidak membundel apa pun.
  const membundel = process.env.EAS_BUILD === "true" || process.env.NODE_ENV === "production";
  const alamatApi = process.env.EXPO_PUBLIC_API_URL ?? "";
  if (membundel && !alamatApi.startsWith("https://")) {
    throw new Error(
      `Varian ${varian} butuh EXPO_PUBLIC_API_URL https:// dari variabel EAS lingkungan "${varian}" (sekarang: "${alamatApi}").`,
    );
  }

  return {
    ...config,
    name,
    slug: config.slug ?? "opennael",
    android: { ...config.android, package: paket },
    ios: { ...config.ios, bundleIdentifier: paket },
  };
};
