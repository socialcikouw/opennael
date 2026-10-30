import type { HariKolektor } from "./data";

/** Keadaan satu hari kolektor untuk lencana daftar. */
export function keadaanHari(h: HariKolektor): {
  teks: string;
  warna: "hijau" | "kuning" | "merah" | "abu";
} {
  if (h.absensi === "tidak_kerja") return { teks: "Tidak kerja", warna: "abu" };
  if (h.serahTerima) {
    const s = h.serahTerima.selisihSetor;
    if (s < 0) return { teks: "Kas diterima · tekor", warna: "merah" };
    return { teks: s > 0 ? "Kas diterima · lebih" : "Kas diterima", warna: "hijau" };
  }
  if (h.laporanDibukaAt) return { teks: "Siap diterima", warna: "kuning" };
  return { teks: "Di lapangan", warna: "abu" };
}
