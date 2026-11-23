import { useSyncExternalStore } from "react";

/**
 * TEMA WEB BOS — Terang (putih kertas + terakota), Gelap ("kertas malam"), atau Ikuti
 * Perangkat (bawaan). Pilihan tersimpan di `localStorage` per peramban; kelas `.dark` di
 * <html> dipasang di sini dan — sebelum React memuat, supaya tak ada kilatan putih — oleh
 * skrip kecil di `index.html` yang membaca kunci yang SAMA (`KUNCI_TEMA`).
 * Nilai warnanya ada di `index.css`.
 */
export type PilihanTema = "terang" | "gelap" | "sistem";

export const KUNCI_TEMA = "nael.tema";

/** Urutan tombol tema: tiap ketukan maju satu. */
export const URUTAN_TEMA: readonly PilihanTema[] = ["sistem", "terang", "gelap"];

export const LABEL_TEMA: Record<PilihanTema, string> = {
  sistem: "Ikuti Perangkat",
  terang: "Terang",
  gelap: "Gelap",
};

/** Nilai tersimpan → pilihan sah; yang tak dikenal (atau kosong) = ikuti perangkat. */
export function bacaPilihan(nilai: string | null): PilihanTema {
  return nilai === "terang" || nilai === "gelap" ? nilai : "sistem";
}

/** Apakah layar harus gelap untuk pilihan ini, mengingat setelan perangkat. */
export function harusGelap(pilihan: PilihanTema, perangkatGelap: boolean): boolean {
  return pilihan === "gelap" || (pilihan === "sistem" && perangkatGelap);
}

export function pilihanBerikut(pilihan: PilihanTema): PilihanTema {
  const i = URUTAN_TEMA.indexOf(pilihan);
  return URUTAN_TEMA[(i + 1) % URUTAN_TEMA.length] ?? "sistem";
}

const kueriGelap = () => window.matchMedia("(prefers-color-scheme: dark)");
const pendengar = new Set<() => void>();

function bacaTersimpan(): PilihanTema {
  try {
    return bacaPilihan(localStorage.getItem(KUNCI_TEMA));
  } catch {
    return "sistem";
  }
}

let pilihanKini: PilihanTema = typeof window === "undefined" ? "sistem" : bacaTersimpan();

function terapkan() {
  document.documentElement.classList.toggle("dark", harusGelap(pilihanKini, kueriGelap().matches));
}

function beritahu() {
  for (const f of pendengar) f();
}

export function gantiTema(pilihan: PilihanTema) {
  pilihanKini = pilihan;
  try {
    if (pilihan === "sistem") localStorage.removeItem(KUNCI_TEMA);
    else localStorage.setItem(KUNCI_TEMA, pilihan);
  } catch {
    // Penyimpanan diblokir: pilihan tetap berlaku sampai halaman dimuat ulang.
  }
  terapkan();
  beritahu();
}

/** Pasang sekali saat aplikasi dimuat: terapkan pilihan & ikuti perubahan setelan perangkat dan tab lain. */
export function pasangTema() {
  terapkan();
  kueriGelap().addEventListener("change", terapkan);
  window.addEventListener("storage", (e) => {
    if (e.key !== KUNCI_TEMA) return;
    pilihanKini = bacaPilihan(e.newValue);
    terapkan();
    beritahu();
  });
}

function langganan(f: () => void) {
  pendengar.add(f);
  return () => pendengar.delete(f);
}

/** Pilihan tema saat ini (untuk tombol tema). */
export function useTema(): PilihanTema {
  return useSyncExternalStore(
    langganan,
    () => pilihanKini,
    () => "sistem",
  );
}
