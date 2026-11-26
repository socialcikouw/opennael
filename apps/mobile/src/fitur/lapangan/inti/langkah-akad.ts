import { geserTanggal, hariPekanDari, TEMPO } from "@opennael/domain";

/**
 * LANGKAH AKAD — urutan layar akad baru, satu pertanyaan per layar (keputusan pemilik
 * lewat simulasi, 26 Nov 2026). PURE.
 *
 *   foto → siapa → [nasabah baru: nama → kampung → kontak]
 *                  [pernah melunasi: pernah-melunasi]
 *        → jenis → pokok → periksa
 *
 * `foto` = kamera serah terima (A7) yang terbuka begitu (+) diketuk. JENIS dipilih dengan
 * sadar di langkahnya sendiri, tak mengikuti tab yang kebetulan dibuka (koreksi pemilik
 * 26 Nov 2026: takut salah input); letaknya sesudah nasabah supaya pinjaman terakhir
 * nasabah yang pernah melunasi bisa ditampilkan. Tak ada langkah tenor: semua jenis
 * bertenor tunggal (A2: harian 25, mingguan 8, tempoan 6 hari kerja — `tenorTunggal`). Pokok sebelum tenor: tiap pilihan tenor langsung menampilkan angsurannya.
 */
export type LangkahAkad =
  | "foto"
  | "siapa"
  | "nama"
  | "kampung"
  | "kontak"
  | "pernah-melunasi"
  | "jenis"
  | "pokok"
  | "periksa";

/** Siapa penerima uangnya: orang yang belum terdaftar, atau nasabah pegangan yang sudah lunas. */
export type SiapaNasabah = "baru" | "pernah-melunasi";

export function urutanLangkah(siapa: SiapaNasabah | null): LangkahAkad[] {
  const urutan: LangkahAkad[] = ["foto", "siapa"];
  // Sebelum dipilih, hitungan langkah memakai jalur terpanjang (nasabah baru).
  if (siapa === "pernah-melunasi") urutan.push("pernah-melunasi");
  else urutan.push("nama", "kampung", "kontak");
  urutan.push("jenis", "pokok", "periksa");
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
export function perkiraanJatuhTempo(hariIni: string): string {
  let t = hariIni;
  for (let n = 0; n < TEMPO.jatuhTempoKe; ) {
    t = geserTanggal(t, 1);
    if (hariPekanDari(t) !== 0) n++;
  }
  return t;
}
