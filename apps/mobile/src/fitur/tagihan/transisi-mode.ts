import { useSyncExternalStore } from "react";
import { type ModeApp, modeAktif } from "./mode";

/**
 * PERMINTAAN BERALIH MODE — semua pergantian mode dari layar (lembar Ganti Mode, tombol
 * "Tagih di mode …" / "Buka Mutasi kas" di Notifikasi) lewat `beralihMode`, supaya
 * selalu didahului layar transisi `TiraiMode`. Tirai yang menjalankan `modeAktif.ganti`
 * di balik layar hitam, lalu `lalu` (mis. pindah tab). Tanpa tirai terpasang (mis. di
 * luar tab kolektor) mode langsung diganti.
 */
export interface PermintaanMode {
  mode: ModeApp;
  /** Dijalankan tepat sesudah mode berganti, masih di balik tirai (mis. `router.navigate`). */
  lalu?: (() => void) | undefined;
  /** Naik tiap permintaan: dua permintaan beruntun tetap dua transisi. */
  ke: number;
}

let permintaan: PermintaanMode | null = null;
let nomor = 0;
let tiraiTerpasang = 0;
const pendengar = new Set<() => void>();

function beritahu() {
  for (const p of pendengar) p();
}

export function beralihMode(mode: ModeApp, lalu?: () => void) {
  if (mode === modeAktif.ambil()) {
    lalu?.();
    return;
  }
  if (tiraiTerpasang === 0) {
    modeAktif.ganti(mode);
    lalu?.();
    return;
  }
  nomor += 1;
  permintaan = { mode, lalu, ke: nomor };
  beritahu();
}

/** Dipanggil tirai sesudah transisi selesai. */
export function selesaiBeralih(ke: number) {
  if (permintaan?.ke !== ke) return;
  permintaan = null;
  beritahu();
}

/** Tirai mendaftar selama terpasang (lihat `beralihMode`). */
export function pasangTirai() {
  tiraiTerpasang += 1;
  return () => {
    tiraiTerpasang -= 1;
  };
}

/** Permintaan yang sedang berjalan (untuk uji; layar memakai `usePermintaanMode`). */
export function ambilPermintaanMode(): PermintaanMode | null {
  return permintaan;
}

export function usePermintaanMode(): PermintaanMode | null {
  return useSyncExternalStore(
    (f) => {
      pendengar.add(f);
      return () => pendengar.delete(f);
    },
    () => permintaan,
  );
}
