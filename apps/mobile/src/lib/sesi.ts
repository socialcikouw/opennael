import type { Profil } from "@opennael/contracts";
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";

/**
 * SESI di HP — token & profil disimpan di brankas aman HP (Keystore /
 * Keychain), bukan penyimpanan biasa. Satu sumber untuk klien API (membaca &
 * memperbarui token) dan layar (siapa yang sedang masuk).
 */
export interface Sesi {
  tokenAkses: string;
  tokenSegar: string;
  pengguna: Profil;
}

const KUNCI = "nael.sesi";

/** `undefined` = belum selesai dibaca dari brankas; `null` = belum masuk. */
let saatIni: Sesi | null | undefined;
const pendengar = new Set<() => void>();

function umumkan() {
  for (const p of pendengar) p();
}

export const sesi = {
  ambil: () => saatIni,

  async muat(): Promise<void> {
    if (saatIni !== undefined) return;
    try {
      const teks = await SecureStore.getItemAsync(KUNCI);
      saatIni = teks ? (JSON.parse(teks) as Sesi) : null;
    } catch {
      saatIni = null;
    }
    umumkan();
  },

  async simpan(baru: Sesi): Promise<void> {
    saatIni = baru;
    umumkan();
    await SecureStore.setItemAsync(KUNCI, JSON.stringify(baru));
  },

  /** Ganti token saja (sesudah refresh), profil tetap. */
  async gantiToken(token: { tokenAkses: string; tokenSegar: string }): Promise<void> {
    if (!saatIni) return;
    await sesi.simpan({ ...saatIni, ...token });
  },

  async hapus(): Promise<void> {
    saatIni = null;
    umumkan();
    await SecureStore.deleteItemAsync(KUNCI);
  },

  dengar(p: () => void) {
    pendengar.add(p);
    return () => {
      pendengar.delete(p);
    };
  },
};

/** Sesi untuk layar — berubah otomatis saat masuk, refresh, atau keluar. */
export function useSesi(): Sesi | null | undefined {
  return useSyncExternalStore(sesi.dengar, sesi.ambil, sesi.ambil);
}
