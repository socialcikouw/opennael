import type { PenyimpanSesi, Sesi } from "@opennael/api-client";
import * as SecureStore from "expo-secure-store";

/** Brankas aman HP (Keystore / Keychain) — tempat sesi disimpan, bukan penyimpanan biasa. */
const KUNCI_SESI = "nael.sesi";

export const penyimpanSesi: PenyimpanSesi = {
  async baca() {
    const teks = await SecureStore.getItemAsync(KUNCI_SESI);
    return teks ? (JSON.parse(teks) as Sesi) : null;
  },
  async tulis(sesi) {
    if (sesi) await SecureStore.setItemAsync(KUNCI_SESI, JSON.stringify(sesi));
    else await SecureStore.deleteItemAsync(KUNCI_SESI);
  },
};
