import type { KartuTagih } from "@opennael/contracts";
import { type JenisPinjaman, wajibDitagihHariIni } from "@opennael/domain";
import { useSyncExternalStore } from "react";

/**
 * MODE APLIKASI KOLEKTOR — tiga "wajah" sesuai jenis pinjaman (Harian ·
 * Mingguan · Tempoan) dan satu wajah pantau (Semua: ketiganya, tanpa transaksi
 * nasabah dan tanpa tombol +). Mode mengubah susunan tab, isi Tagihan &
 * Analitik/Dasbor, jenis akad dari tombol +, dan warna aksen. Tab per mode di
 * `app/kolektor/(tab)/_layout.tsx`: Harian & Mingguan Tagihan · Notifikasi ·
 * Analitik; Tempoan Notifikasi · Tagihan · Analitik; Semua Dasbor · Mutasi ·
 * Storting · Droping · Setelan (`fitur/pantau`). Absen & laporan tetap
 * satu untuk semua mode: laporan menghitung kewajiban hari ini dari semua jenis
 * (C6) — di mode kerja lewat Notifikasi, di mode Semua lewat Mutasi.
 *
 * Mode tidak disimpan: aplikasi selalu dibuka di mode Harian.
 */
export type ModeApp = JenisPinjaman | "semua";

export const URUTAN_MODE: readonly ModeApp[] = ["harian", "mingguan", "tempoan", "semua"];

export const MODE: Record<ModeApp, { label: string; huruf: string; keterangan: string }> = {
  harian: { label: "Harian", huruf: "H", keterangan: "Ditagih setiap hari kerja" },
  mingguan: { label: "Mingguan", huruf: "M", keterangan: "Ditagih sekali seminggu, di hari akad" },
  tempoan: {
    label: "Tempoan",
    huruf: "T",
    keterangan: "Dibayar sekali penuh, paling lambat jatuh tempo",
  },
  semua: { label: "Semua", huruf: "S", keterangan: "Pantau ketiganya · tanpa transaksi" },
};

/** Jenis pinjaman yang menyaring data mode ini; null = Semua (tak disaring). */
export function jenisDariMode(mode: ModeApp): JenisPinjaman | null {
  return mode === "semua" ? null : mode;
}

let aktif: ModeApp = "harian";
const pendengar = new Set<() => void>();

export const modeAktif = {
  ambil: () => aktif,
  ganti(baru: ModeApp) {
    if (baru === aktif) return;
    aktif = baru;
    for (const p of pendengar) p();
  },
  dengar(p: () => void) {
    pendengar.add(p);
    return () => {
      pendengar.delete(p);
    };
  },
};

export function useMode(): ModeApp {
  return useSyncExternalStore(modeAktif.dengar, modeAktif.ambil);
}

export interface RingkasMode {
  /** Pinjaman aktif (berjalan/macet) jenis ini. */
  aktif: number;
  /** Wajib ditagih hari ini (B6 — termasuk tempoan sejak jatuh tempo) dan belum dicatat. */
  tagih: number;
}

/** Angka per mode untuk lembar Ganti Mode. PURE. */
export function ringkasPerMode(
  daftar: readonly KartuTagih[],
  hariIni: string,
): Record<ModeApp, RingkasMode> {
  const hasil: Record<ModeApp, RingkasMode> = {
    harian: { aktif: 0, tagih: 0 },
    mingguan: { aktif: 0, tagih: 0 },
    tempoan: { aktif: 0, tagih: 0 },
    semua: { aktif: 0, tagih: 0 },
  };
  for (const p of daftar) {
    const perlu = !p.hariIni && wajibDitagihHariIni(p, hariIni);
    for (const r of [hasil[p.jenis], hasil.semua]) {
      r.aktif++;
      if (perlu) r.tagih++;
    }
  }
  return hasil;
}
