import { TEBAL, WARNA } from "./token";

/**
 * Rupa header navigasi, dirangkai dari token — satu-satunya tempat gaya header & latar
 * adegan ditentukan, supaya semua tata letak (`_layout.tsx` di `app/`) seragam dan tak ada
 * warna yang ditulis ulang di sana.
 */

/** Header Stack baku layar-layar peran (kolektor, kasir, pengawas). */
export const OPSI_STACK = {
  headerTintColor: WARNA.utama,
  headerTitleStyle: { color: WARNA.teks, fontWeight: TEBAL.tebal },
  headerStyle: { backgroundColor: WARNA.latar },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: "minimal",
  contentStyle: { backgroundColor: WARNA.latar },
} as const;

/** Header & latar adegan tab kolektor (`expo-router/js-tabs`); tab bar-nya `TabMengambang`. */
export const OPSI_TAB = {
  headerTitleStyle: { color: WARNA.teks, fontWeight: TEBAL.tebal },
  headerStyle: { backgroundColor: WARNA.latar },
  headerShadowVisible: false,
  sceneStyle: { backgroundColor: WARNA.latar },
} as const;
