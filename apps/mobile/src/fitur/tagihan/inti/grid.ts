import type { KalenderBulan, Peristiwa } from "@opennael/contracts";
import { geserTanggal, hariPekanDari } from "@opennael/domain";

/**
 * GRID SETORAN SEBULAN di kartu nasabah harian — Senin–Sabtu × pekan bulan
 * berjalan, berhenti di pekan ini (pekan yang belum tiba tak digambar: kartu
 * tumbuh sepanjang bulan, jujur dengan isinya). Sel berupa TEKS seperti buku
 * tulis kolektor: nominal setoran "50k", libur "X", libur kantor "—", hari
 * tagih yang terlewat "·". Semua dihitung di sini; komponen hanya mencetak.
 */

export type KategoriSel =
  | "bayar"
  | "libur"
  | "gulung"
  | "lunas"
  | "liburKantor"
  | "bolos"
  | "hampa";

export interface Sel {
  teks: string;
  kategori: KategoriSel;
  /** Kolom hari ini — dicetak tersorot. */
  hariIni: boolean;
}

export interface BarisPekan {
  /** Pekan ke- di bulan ini (1..6). */
  nomor: number;
  berjalan: boolean;
  /** Selalu 6 sel, Senin → Sabtu. */
  sel: Sel[];
}

export const LABEL_HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;

interface HariKerangka {
  tanggal: string;
  /** Milik bulan lain atau belum tiba — tak pernah berisi. */
  statis: boolean;
}

/** Kerangka tanggal SATU bulan berjalan — sama untuk semua kartu, dihitung sekali per daftar. */
export interface KerangkaGrid {
  hariIni: string;
  /** Kolom hari ini (0 = Senin … 5 = Sabtu); -1 hari Minggu. */
  kolomHariIni: number;
  pekan: { berjalan: boolean; hari: HariKerangka[] }[];
}

/** Senin di pekan `tanggal` (Minggu ikut pekan sebelumnya). */
function seninDari(tanggal: string): string {
  const hari = hariPekanDari(tanggal);
  return geserTanggal(tanggal, hari === 0 ? -6 : 1 - hari);
}

export function susunKerangka(hariIni: string): KerangkaGrid {
  const bulan = hariIni.slice(0, 7);
  const tanggal1 = `${bulan}-01`;
  // Tanggal 1 jatuh hari Minggu: pekan pertama dimulai Senin tanggal 2.
  const seninAwal = hariPekanDari(tanggal1) === 0 ? geserTanggal(tanggal1, 1) : seninDari(tanggal1);
  const seninKini = seninDari(hariIni);
  const pekan: KerangkaGrid["pekan"] = [];
  for (let senin = seninAwal; senin <= seninKini; senin = geserTanggal(senin, 7)) {
    const hari: HariKerangka[] = [];
    for (let i = 0; i < 6; i++) {
      const t = geserTanggal(senin, i);
      hari.push({ tanggal: t, statis: t.slice(0, 7) !== bulan || t > hariIni });
    }
    pekan.push({ berjalan: senin === seninKini, hari });
  }
  return { hariIni, kolomHariIni: hariPekanDari(hariIni) - 1, pekan };
}

/** 50000 → "50k", 1250000 → "1.250k". */
export function nominalK(rupiah: number): string {
  return `${Math.round(rupiah / 1000).toLocaleString("id-ID")}k`;
}

const SEL_HAMPA: Sel = { teks: "", kategori: "hampa", hariIni: false };

function selPeristiwa(p: Peristiwa, hariIni: boolean): Sel {
  switch (p.kategori) {
    case "libur":
      return { teks: "X", kategori: "libur", hariIni };
    case "gulung":
      return { teks: nominalK(p.storting), kategori: "gulung", hariIni };
    case "pelunasan":
      return { teks: nominalK(p.storting), kategori: "lunas", hariIni };
    default:
      return { teks: nominalK(p.storting), kategori: "bayar", hariIni };
  }
}

/** Bahan grid bersama SATU daftar: kerangka, peristiwa per pinjaman, kalender kantor. */
export interface BahanGrid {
  kerangka: KerangkaGrid;
  /** null = riwayat bulan ini belum diketahui (masih dimuat): sel dicetak kosong, bukan "·". */
  peristiwa: ReadonlyMap<string, ReadonlyMap<string, Peristiwa>> | null;
  hariTagih: ReadonlySet<string> | null;
  liburKantor: ReadonlySet<string>;
}

export function susunBahanGrid(
  hariIni: string,
  peristiwa: readonly Peristiwa[] | undefined,
  kalender: KalenderBulan | undefined,
): BahanGrid {
  let peta: Map<string, Map<string, Peristiwa>> | null = null;
  if (peristiwa) {
    peta = new Map();
    for (const p of peristiwa) {
      let perTanggal = peta.get(p.pinjamanId);
      if (!perTanggal) {
        perTanggal = new Map();
        peta.set(p.pinjamanId, perTanggal);
      }
      perTanggal.set(p.tanggal, p);
    }
  }
  return {
    kerangka: susunKerangka(hariIni),
    peristiwa: peta,
    hariTagih: kalender ? new Set(kalender.hariTagih) : null,
    liburKantor: new Set(kalender?.liburKantor.map((l) => l.tanggal) ?? []),
  };
}

/**
 * Baris grid satu pinjaman harian. `tanggalAkad`: hari sebelum akad tak
 * berlaku; hari akad itu sendiri bukan hari tagih (B1) kecuali salinan migrasi.
 */
export function susunGrid(
  bahan: BahanGrid,
  p: { id: string; tanggalAkad: string; asal: string },
): BarisPekan[] {
  const milik = bahan.peristiwa?.get(p.id);
  return bahan.kerangka.pekan.map((pekan, i) => ({
    nomor: i + 1,
    berjalan: pekan.berjalan,
    sel: pekan.hari.map(({ tanggal, statis }) => {
      const hariIni = tanggal === bahan.kerangka.hariIni;
      if (statis || tanggal < p.tanggalAkad) return SEL_HAMPA;
      if (bahan.peristiwa === null) return hariIni ? { ...SEL_HAMPA, hariIni } : SEL_HAMPA;
      const ada = milik?.get(tanggal);
      // Yang benar-benar tercatat selalu menang, walau tanggalnya libur kantor.
      if (ada) return selPeristiwa(ada, hariIni);
      if (bahan.liburKantor.has(tanggal)) return { teks: "—", kategori: "liburKantor", hariIni };
      if (tanggal === p.tanggalAkad && p.asal !== "migrasi") return { ...SEL_HAMPA, hariIni };
      if (bahan.hariTagih && !bahan.hariTagih.has(tanggal)) return { ...SEL_HAMPA, hariIni };
      // Hari ini yang belum dicatat belum bolos — masih bisa ditagih.
      if (hariIni) return { ...SEL_HAMPA, hariIni };
      return { teks: "·", kategori: "bolos", hariIni };
    }),
  }));
}
