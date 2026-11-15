import type { HariKolektor } from "./data";

/** Keadaan satu hari kolektor untuk lencana daftar. */
export function keadaanHari(h: HariKolektor): {
  teks: string;
  warna: "hijau" | "kuning" | "merah" | "abu";
} {
  if (h.absensi === "tidak_kerja") return { teks: "Tidak Kerja", warna: "abu" };
  if (h.serahTerima) {
    const s = h.serahTerima.selisihSetor;
    if (s < 0) return { teks: "Kas Diterima · Tekor", warna: "merah" };
    return { teks: s > 0 ? "Kas Diterima · Lebih" : "Kas Diterima", warna: "hijau" };
  }
  if (h.laporanDibukaAt) return { teks: "Siap Diterima", warna: "kuning" };
  return { teks: "Di Lapangan", warna: "abu" };
}
