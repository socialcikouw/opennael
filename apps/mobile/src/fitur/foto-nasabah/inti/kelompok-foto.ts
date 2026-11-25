import type { KartuTagih } from "@opennael/contracts";
import { kunciWilayah } from "@opennael/domain";

/** Satu foto di galeri: foto serah terima akad terakhir seorang nasabah. */
export interface FotoNasabah {
  nasabahId: string;
  nama: string;
  kampung: string;
  fotoId: string;
  tanggalAkad: string;
}

export interface KelompokFoto {
  /** Kunci kampung (dinormalkan) — kunci render. */
  kunci: string;
  kampung: string;
  foto: FotoNasabah[];
}

/**
 * GALERI FOTO NASABAH (Mode Rekap) — dari daftar tagih pegangan kolektor: SATU foto per
 * nasabah (akad terakhir yang punya foto serah terima; salinan buku lama tanpa foto tak
 * tampil), dikelompokkan per kampung. Kampung urut rute kolektor (`ruteKe` terkecil dulu,
 * belum diatur di belakang, lalu abjad); di dalam kampung urut nama. `cari` (nama, tanpa
 * peduli huruf besar & spasi ganda) menyaring foto; kampung tanpa foto yang cocok hilang. PURE.
 */
export function kelompokFoto(daftar: readonly KartuTagih[], cari = ""): KelompokFoto[] {
  const kunciCari = kunciWilayah(cari);
  const terakhir = new Map<string, KartuTagih>();
  for (const p of daftar) {
    if (!p.fotoSerahTerimaId) continue;
    const ada = terakhir.get(p.nasabah.id);
    if (!ada || p.tanggalAkad > ada.tanggalAkad) terakhir.set(p.nasabah.id, p);
  }

  const kelompok = new Map<string, KelompokFoto & { rute: number }>();
  for (const p of terakhir.values()) {
    if (kunciCari && !kunciWilayah(p.nasabah.nama).includes(kunciCari)) continue;
    const kunci = kunciWilayah(p.nasabah.kampung);
    const k = kelompok.get(kunci) ?? {
      kunci,
      kampung: p.nasabah.kampung,
      foto: [],
      rute: Number.POSITIVE_INFINITY,
    };
    k.rute = Math.min(k.rute, p.ruteKe ?? Number.POSITIVE_INFINITY);
    k.foto.push({
      nasabahId: p.nasabah.id,
      nama: p.nasabah.nama,
      kampung: p.nasabah.kampung,
      fotoId: p.fotoSerahTerimaId as string,
      tanggalAkad: p.tanggalAkad,
    });
    kelompok.set(kunci, k);
  }

  return [...kelompok.values()]
    .sort((a, b) => a.rute - b.rute || a.kunci.localeCompare(b.kunci))
    .map(({ rute: _rute, ...k }) => ({
      ...k,
      foto: k.foto.sort((a, b) => a.nama.localeCompare(b.nama)),
    }));
}
