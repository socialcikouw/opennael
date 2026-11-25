import { useSyncExternalStore } from "react";
import { MODE, type Mode, modeTerpasang } from "./mode";

/**
 * BERALIH MODE — satu-satunya jalan pindah mode (lembar Ganti Mode, tombol "Buka Tab …" di
 * Notifikasi & Mutasi Kas, "Buka Mutasi Kas"). `ke` = layar tujuan (bawaan: tab pertama
 * mode itu).
 *
 * - Mode tujuan SAMA dengan yang terpasang: langsung pindah ke `ke` (mis. tab lain) — tanpa
 *   tirai.
 * - Mode BERBEDA: `TiraiMode` menutup layar, mengganti grup rute di balik tirai, lalu
 *   membuka tirai.
 *
 * Perpindahan sesungguhnya dikerjakan "pengarah" yang dipasang `TiraiMode` (memakai router
 * Expo) — modul ini murni supaya bisa diuji.
 */
export interface PermintaanMode {
  mode: Mode;
  ke: string;
  /** Naik tiap permintaan: dua permintaan beruntun tetap dua transisi. */
  nomor: number;
}

export interface Pengarah {
  /** Pindah layar dalam mode yang sama (tab lain; layar bertumpuk ditutup). */
  pindah: (ke: string) => void;
  /** Ganti grup mode: tutup layar bertumpuk, lalu ganti grup dengan `ke`. */
  gantiMode: (ke: string) => void;
}

let permintaan: PermintaanMode | null = null;
let nomor = 0;
let pengarah: Pengarah | null = null;
const pendengar = new Set<() => void>();

function beritahu() {
  for (const p of pendengar) p();
}

export function beralihMode(mode: Mode, ke: string = MODE[mode].awal) {
  if (!pengarah) return;
  if (mode === modeTerpasang.ambil()) {
    pengarah.pindah(ke);
    return;
  }
  nomor += 1;
  permintaan = { mode, ke, nomor };
  beritahu();
}

/** Dipanggil tirai sesudah transisi selesai. */
export function selesaiBeralih(n: number) {
  if (permintaan?.nomor !== n) return;
  permintaan = null;
  beritahu();
}

/** `TiraiMode` memasang pengarahnya selama terpasang; kembaliannya melepas. */
export function pasangPengarah(p: Pengarah) {
  pengarah = p;
  return () => {
    if (pengarah === p) pengarah = null;
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
