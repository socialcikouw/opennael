import type { JenisPinjaman } from "@opennael/domain";

/**
 * LANGKAH AKAD — urutan layar akad baru, satu pertanyaan per layar (keputusan pemilik
 * lewat simulasi, 26 Nov 2026). PURE.
 *
 *   foto → siapa → [nasabah baru: nama → kampung → kontak]
 *                  [pernah melunasi: pernah-melunasi]
 *        → pokok → [mingguan & tempoan: tenor] → periksa
 *
 * `foto` = kamera serah terima (A7) yang terbuka begitu (+) diketuk. Harian tak punya
 * langkah tenor (hanya 24 kali, A2). Pokok sebelum tenor: tiap pilihan tenor langsung
 * menampilkan angsurannya.
 */
export type LangkahAkad =
  | "foto"
  | "siapa"
  | "nama"
  | "kampung"
  | "kontak"
  | "pernah-melunasi"
  | "pokok"
  | "tenor"
  | "periksa";

/** Siapa penerima uangnya: orang yang belum terdaftar, atau nasabah pegangan yang sudah lunas. */
export type SiapaNasabah = "baru" | "pernah-melunasi";

export function urutanLangkah(siapa: SiapaNasabah | null, jenis: JenisPinjaman): LangkahAkad[] {
  const urutan: LangkahAkad[] = ["foto", "siapa"];
  // Sebelum dipilih, hitungan langkah memakai jalur terpanjang (nasabah baru).
  if (siapa === "pernah-melunasi") urutan.push("pernah-melunasi");
  else urutan.push("nama", "kampung", "kontak");
  urutan.push("pokok");
  if (jenis !== "harian") urutan.push("tenor");
  urutan.push("periksa");
  return urutan;
}

/** Langkah sesudah `kini`; langkah terakhir tetap di tempat. */
export function langkahBerikut(urutan: readonly LangkahAkad[], kini: LangkahAkad): LangkahAkad {
  const i = urutan.indexOf(kini);
  return urutan[Math.min(i + 1, urutan.length - 1)] ?? kini;
}

/** Langkah sebelum `kini`; null di langkah pertama. */
export function langkahSebelum(
  urutan: readonly LangkahAkad[],
  kini: LangkahAkad,
): LangkahAkad | null {
  const i = urutan.indexOf(kini);
  return i > 0 ? (urutan[i - 1] ?? null) : null;
}

/** Nomor langkah (mulai 1) untuk bilah kemajuan "3 / 8". */
export function nomorLangkah(urutan: readonly LangkahAkad[], kini: LangkahAkad): number {
  return urutan.indexOf(kini) + 1;
}
