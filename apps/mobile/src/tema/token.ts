import type { TextStyle } from "react-native";
import { PALET } from "./palet";

/**
 * TOKEN TEMA HP — LAPIS 2, SATU SUMBER KEBENARAN tampilan aplikasi: warna, jarak,
 * sudut, huruf, tinggi sentuh. Aplikasi hanya bertema GELAP (keputusan pemilik,
 * 16 Nov 2026): tak ada pilihan terang, tak ada percabangan tema di layar mana pun.
 *
 * Aturan:
 *  - nilai warna mentah hanya di `palet.ts`; layar tak pernah mengimpor palet;
 *  - nama token menyebut PERAN (`permukaan`, `teksKedua`), bukan warna (`putih`);
 *  - ingin mengganti rupa aplikasi? Ubah rujukan di sini — semua layar mengikuti.
 *
 * Penjelasan lengkap & pembagian lapis: docs/tema.md.
 */

const { slate, emerald, red, amber, violet, orange, teal, mutlak, tirai } = PALET;

/** Warna semantik. Kelompok: latar & permukaan · garis · teks · aksi (utama) · bahaya · waspada · lapisan. */
export const WARNA = {
  /** Latar layar. */
  latar: slate[950],
  /** Kartu, isian, tombol kedua, tab bar. */
  permukaan: slate[900],
  /** Isi abu: avatar, lencana netral. */
  abu: slate[800],
  /** Alas kontrol bersegmen. */
  abuTua: slate[700],
  /** Garis kartu. */
  garis: slate[800],
  /** Garis isian & tombol kedua. */
  garisTegas: slate[700],

  teks: slate[50],
  teksTombol: slate[100],
  teksLabel: slate[200],
  teksKedua: slate[300],
  redup: slate[400],
  samar: slate[500],

  /** Hijau (merek) untuk teks, ikon, tab aktif. */
  utama: emerald[400],
  /** Hijau berkontras lebih kuat (teks di atas `utamaMuda`). */
  utamaTua: emerald[300],
  utamaFokus: emerald[500],
  utamaMuda: emerald[900],
  utamaLembut: emerald[950],
  utamaGaris: emerald[800],
  /** Isi tombol utama & tombol (+). */
  utamaIsi: emerald[500],
  /** Teks/ikon di atas `utamaIsi`. */
  teksAtasUtama: slate[950],

  bahaya: red[400],
  bahayaTua: red[300],
  bahayaTeks: red[400],
  bahayaBingkai: red[500],
  bahayaMuda: red[900],
  bahayaLembut: red[950],
  bahayaGaris: red[900],
  /** Teks/ikon di atas isi `bahaya` (lencana merah pekat). */
  teksAtasBahaya: mutlak.putih,

  waspada: amber[400],
  waspadaTua: amber[300],
  waspadaMuda: amber[900],
  waspadaLembut: amber[950],
  waspadaGaris: amber[900],

  /** Teks & ikon di atas foto (cap alamat, keterangan, petunjuk) — selalu putih. */
  diAtasFoto: mutlak.putih,
  /** Latar layar-layar media penuh (kamera, foto layar penuh) — selalu hitam. */
  latarMedia: mutlak.hitam,
  /** Kode QR: latar putih pekat & tinta hitam pekat — kontras penuh supaya terpindai, apa pun temanya. */
  latarQr: mutlak.putih,
  tintaQr: mutlak.hitam,
  /** Lapisan gelap tembus pandang di atas foto (ikon petunjuk, pita alamat). */
  tiraiGelap: tirai.gelap,
  /** Lapisan terang tembus pandang di atas latar gelap (tombol tutup layar penuh). */
  tiraiTerang: tirai.terang,
} as const;

/** Bentuk palet (nama kunci → teks warna); jenis parameter fungsi gaya `(WARNA: Warna) => …`. */
export type Warna = { readonly [K in keyof typeof WARNA]: string };

/**
 * AKSEN MODE kerja kolektor (Harian · Mingguan · Tempoan · Semua): aksen teks/ikon
 * (`teks`), latar lembut (`lembut`), dan isi tombol berteks (`isi` + `teksIsi`).
 * Harian = hijau merek; mode lain punya warna sendiri supaya wajah aplikasi terasa
 * berganti. (Kata "mode" di sini = mode KERJA, bukan terang/gelap — itu sudah tak ada.)
 */
export type WarnaMode = { teks: string; lembut: string; isi: string; teksIsi: string };

export const AKSEN_MODE = {
  harian: { teks: emerald[400], lembut: emerald[950], isi: emerald[500], teksIsi: slate[950] },
  mingguan: { teks: violet[400], lembut: violet[950], isi: violet[500], teksIsi: slate[950] },
  tempoan: { teks: orange[400], lembut: orange[950], isi: orange[500], teksIsi: slate[950] },
  semua: { teks: teal[400], lembut: teal[950], isi: teal[500], teksIsi: slate[950] },
} as const satisfies Record<string, WarnaMode>;

export type NamaMode = keyof typeof AKSEN_MODE;

/** Jarak kelipatan 4 pt — kunci = angka skala Tailwind (`5` = 20 pt, seperti `p-5`). */
export const RUANG = {
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const SUDUT = {
  kecil: 8,
  sedang: 12,
  besar: 16,
  lebar: 24,
  bulat: 9999,
} as const;

/** Ukuran huruf + tinggi baris (skala Tailwind dalam pt). */
export const HURUF = {
  /** Judul kolom grid setoran — di luar skala Tailwind (14 Nov 2026: 9 → 10 pt, terlalu kecil di lapangan). */
  "3xs": { fontSize: 10, lineHeight: 13 },
  /** Label terkecil (judul tab bawah, isi grid) — di luar skala Tailwind (14 Nov 2026: 10 → 11 pt). */
  "2xs": { fontSize: 11, lineHeight: 15 },
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 26 },
  xl: { fontSize: 20, lineHeight: 28 },
  "2xl": { fontSize: 24, lineHeight: 32 },
  "3xl": { fontSize: 30, lineHeight: 36 },
} as const satisfies Record<string, TextStyle>;

export const TEBAL = {
  biasa: "400",
  sedang: "500",
  semi: "600",
  tebal: "700",
  ekstra: "800",
} as const satisfies Record<string, TextStyle["fontWeight"]>;

/** Tinggi sentuhan minimal (pedoman iOS 44 pt). */
export const SENTUH = { kecil: 40, sedang: 44, besar: 52, isianUang: 56 } as const;

/**
 * Nilai bayangan mentah. Layar TIDAK memakainya langsung: lewat `bayangan` /
 * `tepiPanelBawah` di `komponen/ui/bayangan.ts` (hanya iOS; di Android tampil sebagai kotak).
 */
export const BAYANGAN = PALET.bayangan;
