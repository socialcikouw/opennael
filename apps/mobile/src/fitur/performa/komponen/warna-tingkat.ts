import { WARNA } from "@/tema";
import type { KunciTingkat } from "../inti/tingkat";

/**
 * Warna tiap tingkat performa — dari arti warna tema: Sempurna = terakota (merek, padanan
 * biru merek aplikasi lama), Baik = hijau, Buruk = amber, Rusak = merah, Luar Biasa = tinta
 * (di luar skala warna). `isi` = batang & cincin; `lembut` = latar kartu/kapsul; `teks` =
 * tulisan di atas `lembut` (kontras diuji `token.test.ts`).
 */
export const WARNA_TINGKAT: Record<KunciTingkat, { isi: string; lembut: string; teks: string }> = {
  "luar-biasa": { isi: WARNA.teks, lembut: WARNA.isiNetral, teks: WARNA.teks },
  sempurna: { isi: WARNA.utamaIsi, lembut: WARNA.utamaLembut, teks: WARNA.utama },
  baik: { isi: WARNA.sukses, lembut: WARNA.suksesLembut, teks: WARNA.sukses },
  buruk: { isi: WARNA.waspada, lembut: WARNA.waspadaLembut, teks: WARNA.waspada },
  rusak: { isi: WARNA.bahaya, lembut: WARNA.bahayaLembut, teks: WARNA.bahayaTeks },
  kosong: { isi: WARNA.garisTegas, lembut: WARNA.isiNetral, teks: WARNA.redup },
};
