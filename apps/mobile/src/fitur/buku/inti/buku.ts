import type { IndeksBuku } from "@opennael/contracts";
import { kunciWilayah } from "@opennael/domain";

/**
 * BUKU kolektor (Mode Rekap › Menu › Buku, 28 Nov 2026; rupa Buku v2 aplikasi lama) — indeks
 * SEMUA nasabah pegangan yang pernah meminjam, urut abjad dengan huruf indeks yang
 * menempel; pil Semua · Aktif · Macet · Selesai berangka; cari nama atau kampung. Ketuk =
 * Detail Nasabah (semua pinjamannya). Data `GET /lapangan/buku`. PURE.
 */

export type SaringanBuku = "semua" | "aktif" | "macet" | "selesai";

export const URUTAN_SARINGAN: readonly SaringanBuku[] = ["semua", "aktif", "macet", "selesai"];

export const LABEL_SARINGAN: Record<SaringanBuku, string> = {
  semua: "Semua",
  aktif: "Aktif",
  macet: "Macet",
  selesai: "Selesai",
};

/** Keadaan nasabah menurut pinjaman terbarunya. */
export function keadaanNasabah(b: IndeksBuku): Exclude<SaringanBuku, "semua"> {
  if (b.terakhir.status === "berjalan") return "aktif";
  if (b.terakhir.status === "macet") return "macet";
  return "selesai";
}

/** Huruf indeks: huruf pertama nama (A–Z), selain itu "#". */
export function hurufIndeks(nama: string): string {
  const h = nama.trim().charAt(0).toUpperCase();
  return h >= "A" && h <= "Z" ? h : "#";
}

export interface SeksiBuku {
  huruf: string;
  data: IndeksBuku[];
}

export interface IndeksTersusun {
  seksi: SeksiBuku[];
  /** Banyaknya nasabah per saringan SESUDAH pencarian (angka di pil). */
  jumlah: Record<SaringanBuku, number>;
  /** Σ pinjaman nasabah yang tampil. */
  jumlahPinjaman: number;
}

/** Satu lintasan: cari (nama/kampung) → hitung per saringan → saring → seksi abjad. */
export function susunIndeks(
  daftar: readonly IndeksBuku[],
  saring: SaringanBuku,
  cari: string,
): IndeksTersusun {
  const kunci = kunciWilayah(cari);
  const jumlah: Record<SaringanBuku, number> = { semua: 0, aktif: 0, macet: 0, selesai: 0 };
  const per = new Map<string, IndeksBuku[]>();
  let jumlahPinjaman = 0;
  for (const b of daftar) {
    if (
      kunci &&
      !kunciWilayah(b.nasabah.nama).includes(kunci) &&
      !kunciWilayah(b.nasabah.kampung).includes(kunci)
    ) {
      continue;
    }
    const k = keadaanNasabah(b);
    jumlah.semua++;
    jumlah[k]++;
    if (saring !== "semua" && k !== saring) continue;
    jumlahPinjaman += b.jumlahPinjaman;
    const h = hurufIndeks(b.nasabah.nama);
    const isi = per.get(h) ?? [];
    isi.push(b);
    per.set(h, isi);
  }
  const seksi = [...per.entries()]
    .sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)))
    .map(([huruf, data]) => ({
      huruf,
      data: data.sort((x, y) => x.nasabah.nama.localeCompare(y.nasabah.nama)),
    }));
  return { seksi, jumlah, jumlahPinjaman };
}
