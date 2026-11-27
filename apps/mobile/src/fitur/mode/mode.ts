import { useEffect, useSyncExternalStore } from "react";

/**
 * MODE HP KOLEKTOR — tiga "ruang kerja" (keputusan pemilik 26 Nov 2026):
 *   Kerja  — tab Harian · Mingguan · Tempoan, tombol + akad;
 *   Rekap  — tab Ringkasan · Performa · Portofolio, tombol Foto Nasabah;
 *   Akun   — tab Profil · Pengaturan · Bantuan.
 *
 * Mode TIDAK disimpan sendiri: tiap mode = satu grup rute (`app/kolektor/(kerja)`, `(rekap)`,
 * `(akun)`), dan tata letak grup yang sedang terpasang memasangnya lewat `usePasangMode` —
 * jadi mode selalu sama dengan layar yang tampil. Layar bertumpuk di atasnya (Notifikasi,
 * Bayar, …) tetap membaca mode grup di bawahnya. Pindah mode: `beralihMode`
 * (`transisi-mode.ts`). Kata "mode" hanya untuk tiga ini; harian · mingguan · tempoan = jenis.
 */
export type Mode = "kerja" | "rekap" | "akun";

export const URUTAN_MODE: readonly Mode[] = ["kerja", "rekap", "akun"];

export const MODE: Record<
  Mode,
  { label: string; huruf: string; keterangan: string; tab: string; awal: string }
> = {
  kerja: {
    label: "Kerja",
    huruf: "K",
    keterangan: "Menagih & akad baru di lapangan",
    tab: "Harian · Mingguan · Tempoan · (+) Akad",
    awal: "/kolektor/harian",
  },
  rekap: {
    label: "Rekap",
    huruf: "R",
    keterangan: "Kas, laporan sore, performa, portofolio, gaji",
    tab: "Ringkasan · Performa · Portofolio · Menu (Gaji, Foto)",
    awal: "/kolektor/ringkasan",
  },
  akun: {
    label: "Akun",
    huruf: "A",
    keterangan: "Profil, pengaturan & bantuan",
    tab: "Profil · Pengaturan · Bantuan",
    awal: "/kolektor/profil",
  },
};

let terpasang: { mode: Mode; tanda: number } | null = null;
let tandaBerikut = 0;
const pendengar = new Set<() => void>();

function beritahu() {
  for (const p of pendengar) p();
}

/** Mode grup rute yang sedang terpasang; null = belum ada (mis. di luar layar kolektor). */
export const modeTerpasang = {
  ambil: (): Mode | null => terpasang?.mode ?? null,
  /**
   * Dipanggil tata letak grup saat terpasang; kembaliannya melepas. Saat berganti mode,
   * grup baru bisa terpasang SEBELUM grup lama dilepas — pelepasan hanya berlaku bila
   * pemasangannya masih yang terakhir (tanda sama).
   */
  pasang(mode: Mode): () => void {
    tandaBerikut += 1;
    const tanda = tandaBerikut;
    terpasang = { mode, tanda };
    beritahu();
    return () => {
      if (terpasang?.tanda !== tanda) return;
      terpasang = null;
      beritahu();
    };
  },
};

function dengar(p: () => void) {
  pendengar.add(p);
  return () => {
    pendengar.delete(p);
  };
}

export function useMode(): Mode | null {
  return useSyncExternalStore(dengar, modeTerpasang.ambil);
}

/** Tata letak grup rute mode memanggil ini sekali: mode = grup ini selama terpasang. */
export function usePasangMode(mode: Mode) {
  useEffect(() => modeTerpasang.pasang(mode), [mode]);
}
