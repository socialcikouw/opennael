import type { Profil } from "@opennael/contracts";
import { useSyncExternalStore } from "react";

/**
 * SESI KLIEN — siapa yang sedang masuk dan token-tokennya. Satu sumber untuk
 * transport (membaca & memperbarui token) dan layar (siapa yang masuk).
 * Tempat menyimpannya disuntik aplikasi: web `localStorage`, HP brankas aman.
 */
export interface Sesi {
  tokenAkses: string;
  tokenSegar: string;
  pengguna: Profil;
}

export interface PenyimpanSesi {
  /** Pembacaan awal sinkron (web): sesi langsung tersedia sejak dibuat. */
  bacaSinkron?(): Sesi | null;
  /** Pembacaan asinkron (HP): dipanggil `muat()`; sebelum selesai sesi `undefined`. */
  baca?(): Promise<Sesi | null>;
  /** Simpan sesi (`null` = hapus). */
  tulis(sesi: Sesi | null): void | Promise<void>;
  /** Perubahan dari luar (mis. tab lain) — kembalikan fungsi untuk berhenti memantau. */
  pantau?(sesudahBerubah: (sesi: Sesi | null) => void): () => void;
}

export function buatSesi(penyimpan: PenyimpanSesi) {
  /** `undefined` = belum selesai dibaca; `null` = belum masuk. */
  let saatIni: Sesi | null | undefined = penyimpan.bacaSinkron?.();
  const pendengar = new Set<() => void>();
  const umumkan = () => {
    for (const p of pendengar) p();
  };
  penyimpan.pantau?.((baru) => {
    saatIni = baru;
    umumkan();
  });

  const sesi = {
    ambil: (): Sesi | null | undefined => saatIni,

    async muat(): Promise<void> {
      if (saatIni !== undefined) return;
      try {
        saatIni = (await penyimpan.baca?.()) ?? null;
      } catch {
        saatIni = null;
      }
      umumkan();
    },

    async simpan(baru: Sesi): Promise<void> {
      saatIni = baru;
      umumkan();
      await penyimpan.tulis(baru);
    },

    /** Ganti token saja (sesudah refresh), profil tetap. */
    async gantiToken(token: { tokenAkses: string; tokenSegar: string }): Promise<void> {
      if (!saatIni) return;
      await sesi.simpan({ ...saatIni, ...token });
    },

    async hapus(): Promise<void> {
      saatIni = null;
      umumkan();
      await penyimpan.tulis(null);
    },

    dengar(p: () => void) {
      pendengar.add(p);
      return () => {
        pendengar.delete(p);
      };
    },
  };
  return sesi;
}

export type TokoSesi = ReturnType<typeof buatSesi>;

/** Sesi untuk layar — berubah otomatis saat masuk, refresh, atau keluar. */
export function useSesi(sesi: TokoSesi): Sesi | null | undefined {
  return useSyncExternalStore(sesi.dengar, sesi.ambil, sesi.ambil);
}
