import type { TextStyle } from "react-native";
import { PALET } from "./palet";

/**
 * TOKEN TEMA HP — LAPIS 2, SATU SUMBER KEBENARAN tampilan aplikasi: warna, jarak,
 * sudut, huruf, tinggi sentuh. Aplikasi hanya bertema TERANG — putih kertas + terakota
 * (keputusan pemilik, 24 Nov 2026; menggantikan "hanya gelap" 16 Nov): tak ada pilihan
 * tema, tak ada percabangan tema di layar mana pun.
 *
 * Aturan:
 *  - nilai warna mentah hanya di `palet.ts`; layar tak pernah mengimpor palet;
 *  - nama token menyebut PERAN (`permukaan`, `teksKedua`), bukan warna (`putih`);
 *  - KEDALAMAN tanpa bayangan: `latar` kertas → `permukaan` putih hangat (kartu, isian);
 *    yang melayang (`permukaanTinggi`: tab bar, lembar) sama putihnya dan dipisah GARIS;
 *  - ARTI WARNA terpisah dari MEREK: `utama*` (terakota) = merek & aksi; `sukses*` (hijau)
 *    = berhasil / boleh; `bahaya*` (merah) = galat & belum boleh; `waspada*` (amber tua) =
 *    peringatan. Jangan memakai `utama` untuk arti "berhasil";
 *  - ingin mengganti rupa aplikasi? Ubah rujukan di sini — semua layar mengikuti.
 *
 * Penjelasan lengkap & pembagian lapis: docs/tema.md.
 */

const { kertas, terakota, emerald, red, amber, mutlak, tirai } = PALET;

/**
 * Warna semantik. Kelompok: latar & permukaan · isi netral · garis · teks · aksi (utama) ·
 * sukses · bahaya · waspada · di atas foto / media · lapisan.
 */
export const WARNA = {
  /** Latar layar — kertas, tingkat paling dalam. */
  latar: kertas[100],
  /** Kartu, isian, tombol kedua — putih hangat. */
  permukaan: kertas[50],
  /** Yang melayang di atas isi: tab bar, lembar bawah — putih seperti kartu, dipisah `garis`. */
  permukaanTinggi: kertas[50],
  /** Isi netral: kolom di dalam kartu, avatar, lencana netral, kerangka muat, tombol papan angka. */
  isiNetral: kertas[100],
  /** Isi netral lebih tegas: segmen aktif, tombol tertekan, kotak jumlah, penanda kosong. */
  isiNetralTegas: kertas[200],
  /** Garis kartu & pemisah (hiasan). */
  garis: kertas[200],
  /** Batas isian & tombol kedua, rel pohon (≥ 3:1 — pembatas komponen harus terlihat). */
  garisTegas: kertas[500],

  teks: kertas[900],
  teksTombol: kertas[900],
  teksLabel: kertas[800],
  teksKedua: kertas[700],
  redup: kertas[600],
  samar: kertas[500],

  /** Terakota (merek) untuk teks, ikon, tab aktif, tautan. */
  utama: terakota[700],
  /** Terakota berkontras lebih kuat (teks di atas `utamaMuda` & segmen aktif). */
  utamaTua: terakota[800],
  /** Bingkai isian yang sedang diketik (≥ 3:1 di atas permukaan). */
  utamaFokus: terakota[500],
  utamaMuda: terakota[100],
  utamaLembut: terakota[50],
  utamaGaris: terakota[200],
  /** Isi tombol utama, tombol (+), lingkaran angsuran — coral terang. */
  utamaIsi: terakota[400],
  /** Teks/ikon di atas `utamaIsi` — GELAP (tulisan putih di coral hanya 3,1:1). */
  teksAtasUtama: kertas[900],

  /** Hijau = berhasil / boleh: Bisa Digulung, lencana Baru & Gulung Naik, lebih setor, foto siap. */
  sukses: emerald[700],
  suksesTua: emerald[800],
  suksesMuda: emerald[100],
  suksesLembut: emerald[50],
  suksesGaris: emerald[200],

  /** Teks & ikon merah (galat, libur, belum boleh). */
  bahaya: red[700],
  bahayaTua: red[800],
  bahayaTeks: red[700],
  /** Isi merah pekat (lencana angka, bingkai galat). */
  bahayaBingkai: red[600],
  bahayaMuda: red[100],
  bahayaLembut: red[50],
  bahayaGaris: red[200],
  /** Teks/ikon di atas isi `bahaya` / `bahayaBingkai` (lencana merah pekat) — putih, ≥ 4,5:1. */
  teksAtasBahaya: mutlak.putih,

  waspada: amber[800],
  waspadaTua: amber[900],
  waspadaMuda: amber[100],
  waspadaLembut: amber[50],
  waspadaGaris: amber[200],

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
  /** Lapisan kertas tembus pandang yang menutup kartu selama tulisan berjalan ("Mencatat…"). */
  tiraiSibuk: tirai.kertas,
} as const;

/** Bentuk palet (nama kunci → teks warna); jenis parameter fungsi gaya `(WARNA: Warna) => …`. */
export type Warna = { readonly [K in keyof typeof WARNA]: string };

/**
 * AKSEN MODE kerja kolektor (Harian · Mingguan · Tempoan · Laporan): aksen teks/ikon
 * (`teks`), latar lembut (`lembut`), dan isi tombol berteks (`isi` + `teksIsi`).
 * SEMUA MODE MEMAKAI TERAKOTA (keputusan pemilik, 24 Nov 2026: konsisten); mode dikenali
 * dari huruf H/M/T/L dan label mode, bukan warna. Bentuknya tetap per mode supaya mode
 * bisa diberi warna sendiri lagi tanpa menyentuh layar. (Kata "mode" di sini = mode
 * KERJA, bukan terang/gelap.)
 */
export type WarnaMode = { teks: string; lembut: string; isi: string; teksIsi: string };

const AKSEN_TERAKOTA: WarnaMode = {
  teks: WARNA.utama,
  lembut: WARNA.utamaLembut,
  isi: WARNA.utamaIsi,
  teksIsi: WARNA.teksAtasUtama,
};

export const AKSEN_MODE = {
  harian: AKSEN_TERAKOTA,
  mingguan: AKSEN_TERAKOTA,
  tempoan: AKSEN_TERAKOTA,
  laporan: AKSEN_TERAKOTA,
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
  /** Angka pahlawan layar transaksi (nominal Bayar & Gulung) — satu-satunya di atas skala Tailwind. */
  hero: { fontSize: 48, lineHeight: 56 },
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
