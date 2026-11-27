import { perkiraanJatuhTempo as perkiraanDomain } from "@opennael/domain";

/**
 * LANGKAH AKAD — urutan layar akad baru, satu pertanyaan per layar (keputusan pemilik
 * lewat simulasi, 26 Nov 2026). PURE.
 *
 *   siapa → [nasabah baru: data (nama, NIK, nomor HP) → kampung]
 *           [pernah melunasi: pernah-melunasi]
 *         → jenis → pokok → foto → periksa (Cairkan)
 *
 * `foto` = kamera serah terima (A7) langsung sesudah pokok (keputusan pemilik 26 Nov 2026,
 * menggantikan foto di awal): "Selanjutnya" di pokok meminta server memeriksa akad lebih
 * dulu (`POST /lapangan/akad/periksa`, tanpa menulis), baru kamera — uang diserahkan
 * sesudah jumlahnya pasti dan akadnya boleh. Periksa sesudah foto = ringkasan + Cairkan.
 * Nama, NIK, nomor HP satu lembar (permintaan pemilik 26 Nov 2026). JENIS dipilih dengan
 * sadar di langkahnya sendiri, tak mengikuti tab yang kebetulan dibuka (koreksi pemilik
 * 26 Nov 2026: takut salah input); letaknya sesudah nasabah supaya pinjaman terakhir
 * nasabah yang pernah melunasi bisa ditampilkan. Tak ada langkah tenor: semua jenis
 * bertenor tunggal (A2: harian 25, mingguan 8, tempoan 6 hari kerja — `tenorTunggal`).
 */
export type LangkahAkad =
  | "siapa"
  | "data"
  | "kampung"
  | "pernah-melunasi"
  | "jenis"
  | "pokok"
  | "periksa"
  | "foto";

/** Siapa penerima uangnya: orang yang belum terdaftar, atau nasabah pegangan yang sudah lunas. */
export type SiapaNasabah = "baru" | "pernah-melunasi";

export function urutanLangkah(siapa: SiapaNasabah | null): LangkahAkad[] {
  const urutan: LangkahAkad[] = ["siapa"];
  // Sebelum dipilih, hitungan langkah memakai jalur terpanjang (nasabah baru).
  if (siapa === "pernah-melunasi") urutan.push("pernah-melunasi");
  else urutan.push("data", "kampung");
  urutan.push("jenis", "pokok", "foto", "periksa");
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

/**
 * PERKIRAAN jatuh tempo tempoan untuk layar Periksa: hari ke-6 sesudah `hariIni` bila
 * kolektor masuk kerja Senin–Sabtu (A4). Hanya perkiraan — yang berlaku dihitung server
 * dari absen sungguhan (libur kantor & hari tidak kerja menggesernya).
 */
export const perkiraanJatuhTempo = (hariIni: string): string => perkiraanDomain(hariIni);
