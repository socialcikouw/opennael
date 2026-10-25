import type { Profil } from "@opennael/contracts";
import { useSyncExternalStore } from "react";

/**
 * SESI BOS di browser — `localStorage` supaya bos tetap masuk sesudah browser
 * ditutup. Token segar per perangkat bisa dicabut bos (keluar / putus
 * perangkat), dan token akses hanya berumur 15 menit.
 */
export interface Sesi {
  tokenAkses: string;
  tokenSegar: string;
  pengguna: Profil;
}

const KUNCI = "nael.sesi.bos";

function baca(): Sesi | null {
  try {
    const teks = localStorage.getItem(KUNCI);
    return teks ? (JSON.parse(teks) as Sesi) : null;
  } catch {
    return null;
  }
}

let saatIni: Sesi | null = baca();
const pendengar = new Set<() => void>();
const umumkan = () => {
  for (const p of pendengar) p();
};

// Keluar / masuk di tab lain ikut terbaca di tab ini.
window.addEventListener("storage", (e) => {
  if (e.key !== KUNCI) return;
  saatIni = baca();
  umumkan();
});

export const sesi = {
  ambil: () => saatIni,

  simpan(baru: Sesi) {
    saatIni = baru;
    localStorage.setItem(KUNCI, JSON.stringify(baru));
    umumkan();
  },

  gantiToken(token: { tokenAkses: string; tokenSegar: string }) {
    if (saatIni) sesi.simpan({ ...saatIni, ...token });
  },

  hapus() {
    saatIni = null;
    localStorage.removeItem(KUNCI);
    umumkan();
  },

  dengar(p: () => void) {
    pendengar.add(p);
    return () => {
      pendengar.delete(p);
    };
  },
};

export function useSesi(): Sesi | null {
  return useSyncExternalStore(sesi.dengar, sesi.ambil);
}
