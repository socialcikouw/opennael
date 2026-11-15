import { AKSEN_MODE, type NamaMode, TEBAL, WARNA, type Warna, type WarnaMode } from "@/tema";

/**
 * AKSES TEMA UNTUK KOMPONEN — aplikasi hanya bertema gelap (keputusan pemilik, 16 Nov
 * 2026), jadi tak ada penyedia, pilihan, maupun percabangan terang/gelap: semuanya
 * membaca SATU palet dari `@/tema`.
 *
 * Hook-hook ini sengaja dipertahankan supaya layar lama tak perlu berubah selama
 * Tahap 1–2 pekerjaan tema (docs/tema.md). Layar BARU boleh mengimpor `WARNA` dari
 * `@/tema` langsung dan memakai `StyleSheet.create` di tingkat modul; hook ini akan
 * hilang sendiri seiring layar didesain ulang.
 */

/** Palet warna aplikasi. */
export function useWarna(): Warna {
  return WARNA;
}

/** Gaya hasil `buat(palet)`, dibuat sekali per fungsi dan dipakai bersama semua pemanggil. */
const simpananGaya = new WeakMap<object, unknown>();

export function useGaya<T>(buat: (w: Warna) => T): T {
  if (!simpananGaya.has(buat)) simpananGaya.set(buat, buat(WARNA));
  return simpananGaya.get(buat) as T;
}

/** Warna aksen mode KERJA kolektor (Harian/Mingguan/Tempoan/Semua). */
export function useWarnaMode(mode: NamaMode): WarnaMode {
  return AKSEN_MODE[mode];
}

const buatOpsiStack = (WARNA: Warna) =>
  ({
    headerTintColor: WARNA.utama,
    headerTitleStyle: { color: WARNA.teks, fontWeight: TEBAL.tebal },
    headerStyle: { backgroundColor: WARNA.latar },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
    contentStyle: { backgroundColor: WARNA.latar },
  }) as const;

/** Header Stack baku layar-layar peran (kolektor, kasir, pengawas). */
export function useOpsiStack() {
  return useGaya(buatOpsiStack);
}
