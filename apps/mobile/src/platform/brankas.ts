import type { MediumKunci, PenyimpanSesi, Sesi } from "@opennael/api-client";
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

const KUNCI_TERTUNDA = "nael.kunci-tertunda";

/**
 * Kunci idempoten yang belum mendapat jawaban pasti (sinyal putus di tengah
 * kiriman) bertahan sampai aplikasi dibuka lagi, supaya ketukan ulang memakai
 * kunci yang sama. Isinya hanya UUID + ringkasan permintaan, jauh di bawah batas
 * ±2 KB brankas (penyimpan membatasi jumlahnya).
 */
export const mediumKunciTertunda: MediumKunci = {
  baca: () => SecureStore.getItemAsync(KUNCI_TERTUNDA),
  async tulis(teks) {
    if (teks) await SecureStore.setItemAsync(KUNCI_TERTUNDA, teks);
    else await SecureStore.deleteItemAsync(KUNCI_TERTUNDA);
  },
};
