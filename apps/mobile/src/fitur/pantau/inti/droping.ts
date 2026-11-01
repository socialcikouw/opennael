import type { KartuTagih } from "@opennael/contracts";
import type { JenisPinjaman } from "@opennael/domain";

/**
 * TAB DROPING (mode Semua) — pokok pinjaman yang keluar hari ini dari ketiga
 * jenis: akad baru (drop baru) dan gulung (drop gulung = bagian yang memutar
 * pinjaman lama; aturan-usaha E7). Diambil dari daftar tagih kolektor (akad
 * hari ini, bukan salinan migrasi) — aturan yang sama dengan segmen Droping
 * di Tagihan. PURE.
 */

/** Akad hari ini milik kolektor ini, terbaru dulu. */
export function dropingHariIni(daftar: readonly KartuTagih[], hariIni: string): KartuTagih[] {
  return daftar
    .filter((p) => p.tanggalAkad === hariIni && p.asal !== "migrasi")
    .sort((a, b) => (b.waktuAkad ?? "").localeCompare(a.waktuAkad ?? ""));
}

export interface RingkasDroping {
  /** Droping = drop baru + drop gulung (pokok penuh). */
  total: number;
  baru: number;
  gulung: number;
  /** Tunai yang benar-benar diterima nasabah. */
  pencairan: number;
  /** Banyaknya akad. */
  jumlah: number;
}

export function ringkasDroping(daftar: readonly KartuTagih[]): RingkasDroping {
  const r: RingkasDroping = {
    total: 0,
    baru: 0,
    gulung: 0,
    pencairan: 0,
    jumlah: daftar.length,
  };
  for (const p of daftar) {
    r.baru += p.dropBaru;
    r.gulung += p.dropGulung;
    r.pencairan += p.pencairan;
  }
  r.total = r.baru + r.gulung;
  return r;
}

export interface BarisDroping {
  id: string;
  jenis: JenisPinjaman;
  nama: string;
  kampung: string;
  /** "Akad baru" / "Gulung naik" / "Gulung tetap" / "Gulung turun". */
  asal: string;
  gulung: boolean;
  pokok: number;
  pencairan: number;
  pinjamanKe: number;
  waktuAkad: string | null;
}

export function barisDroping(p: KartuTagih): BarisDroping {
  const gulung = p.asal === "gulung";
  return {
    id: p.id,
    jenis: p.jenis,
    nama: p.nasabah.nama,
    kampung: p.nasabah.kampung,
    asal: gulung ? `Gulung ${p.jenisGulung ?? ""}`.trim() : "Akad baru",
    gulung,
    pokok: p.pokok,
    pencairan: p.pencairan,
    pinjamanKe: p.pinjamanKe,
    waktuAkad: p.waktuAkad,
  };
}
