import type { KartuTagih } from "@opennael/contracts";
import { type JenisPinjaman, kunciWilayah, perkiraanJatuhTempo } from "@opennael/domain";
import { tanggal } from "@opennael/format";

/** Satu kartu di tab Foto: seorang nasabah pegangan dan foto serah terima terakhirnya. */
export interface FotoNasabah {
  nasabahId: string;
  nama: string;
  kampung: string;
  /** Foto akad terakhir yang berfoto; null = belum pernah (salinan buku lama) → avatar. */
  fotoId: string | null;
  tanggalAkad: string;
  /** Angsuran ke- (banyaknya angsuran yang sudah terbayar) pinjaman itu. */
  angsuranKe: number;
  /** Jenis pinjaman terbaru — label nominal angsuran ("Harian Rp …"). */
  jenis: JenisPinjaman;
  /** Nominal satu angsuran (tempoan: sekali bayar). */
  angsuran: number;
  /**
   * Hari tagihnya: mingguan = hari akad (akad + 7k, B3); tempoan = hari jatuh tempo (dari
   * server bila sudah pasti, selain itu perkiraan 6 hari kerja, A4); harian = null.
   */
  hariTagih: string | null;
  macet: boolean;
}

/** Kartu yang punya foto — isi layar penuh. */
export type FotoBerfoto = FotoNasabah & { fotoId: string };

export const berfoto = (f: FotoNasabah): f is FotoBerfoto => f.fotoId !== null;

export interface KelompokFoto {
  /** Kunci kampung (dinormalkan) — kunci render. */
  kunci: string;
  kampung: string;
  foto: FotoNasabah[];
}

/**
 * TAB FOTO (Mode Rekap, 28 Nov 2026) — dari daftar tagih pegangan kolektor: SEMUA nasabah,
 * satu kartu per nasabah (angka dari pinjaman terbarunya; foto dari akad terakhir yang punya
 * foto serah terima, null bila belum ada — kartu memakai avatar), dikelompokkan per kampung. Kampung urut rute kolektor (`ruteKe` terkecil dulu,
 * belum diatur di belakang, lalu abjad); di dalam kampung urut nama. `cari` (nama, tanpa
 * peduli huruf besar & spasi ganda) menyaring foto; kampung tanpa foto yang cocok hilang. PURE.
 */
/** "Rabu" dari tanggal kantor. */
const namaHari = (t: string) => tanggal(t, "panjang").split(",")[0] ?? null;

function hariTagih(p: KartuTagih): string | null {
  if (p.jenis === "mingguan") return namaHari(p.tanggalAkad);
  if (p.jenis === "tempoan") return namaHari(p.jatuhTempo ?? perkiraanJatuhTempo(p.tanggalAkad));
  return null;
}

export function kelompokFoto(daftar: readonly KartuTagih[], cari = ""): KelompokFoto[] {
  const kunciCari = kunciWilayah(cari);
  const terakhir = new Map<string, KartuTagih>();
  const fotoTerakhir = new Map<string, KartuTagih>();
  for (const p of daftar) {
    const ada = terakhir.get(p.nasabah.id);
    if (!ada || p.tanggalAkad > ada.tanggalAkad) terakhir.set(p.nasabah.id, p);
    if (!p.fotoSerahTerimaId) continue;
    const adaFoto = fotoTerakhir.get(p.nasabah.id);
    if (!adaFoto || p.tanggalAkad > adaFoto.tanggalAkad) fotoTerakhir.set(p.nasabah.id, p);
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
      fotoId: fotoTerakhir.get(p.nasabah.id)?.fotoSerahTerimaId ?? null,
      tanggalAkad: p.tanggalAkad,
      angsuranKe: p.angsuranKe,
      jenis: p.jenis,
      angsuran: p.angsuran,
      hariTagih: hariTagih(p),
      macet: p.status === "macet",
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
