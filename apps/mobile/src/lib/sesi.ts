import {
  buatSesi,
  type PenyimpanSesi,
  type Sesi,
  useSesi as useSesiDasar,
} from "@opennael/api-client";
import * as SecureStore from "expo-secure-store";

/**
 * SESI di HP — token & profil disimpan di brankas aman HP (Keystore /
 * Keychain), bukan penyimpanan biasa. Satu sumber untuk klien API (membaca &
 * memperbarui token) dan layar (siapa yang sedang masuk).
 */
export type { Sesi };

const KUNCI = "nael.sesi";

const penyimpan: PenyimpanSesi = {
  async baca() {
    const teks = await SecureStore.getItemAsync(KUNCI);
    return teks ? (JSON.parse(teks) as Sesi) : null;
  },
  async tulis(sesi) {
    if (sesi) await SecureStore.setItemAsync(KUNCI, JSON.stringify(sesi));
    else await SecureStore.deleteItemAsync(KUNCI);
  },
};

/** `ambil()` = `undefined` selama belum selesai dibaca dari brankas; `null` = belum masuk. */
export const sesi = buatSesi(penyimpan);

/** Sesi untuk layar — berubah otomatis saat masuk, refresh, atau keluar. */
export function useSesi(): Sesi | null | undefined {
  return useSesiDasar(sesi);
}
