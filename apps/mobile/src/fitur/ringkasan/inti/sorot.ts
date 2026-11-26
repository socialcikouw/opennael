import type { PratinjauGaji, Ringkasan } from "@opennael/contracts";
import type { JenisPinjaman } from "@opennael/domain";
import { LABEL_JENIS } from "@opennael/format";
import type { NamaIkon } from "../../../komponen/ui/daftar-ikon";
import { type SegmenVM, type SelisihVM, selisih, susunSegmen } from "./komposisi";

/**
 * KARTU SOROT RINGKASAN — satu bidang pekat di puncak layar untuk angka yang paling
 * dicari kolektor pada periode & jenis yang dipilih:
 *   - Hari Ini, semua jenis → Mutasi Kas (komponen sendiri: gembok, Buka Laporan);
 *   - periode lain, semua jenis → GAJI (aturan-usaha J; keputusan pemilik 27 Nov 2026);
 *   - satu jenis → STORTING jenis itu.
 * Rumusnya dicetak kecil di bawah angka dan bahannya di keping kaki, supaya angka besar
 * bisa dicek dengan mata. PURE.
 */

export interface SorotVM {
  label: string;
  ikon: NamaIkon;
  nilai: number;
  /** Keping kecil di samping angka: "Perkiraan", "Sudah Dibayar", "Minus". */
  lencana: string | null;
  rumus: string;
  selisih: SelisihVM | null;
  segmen: SegmenVM[] | null;
  keping: { label: string; nilai: number }[];
  /** Satu keping di bawah, di tengah (mis. Tabungan keluar). */
  kepingBawah: { label: string; nilai: number } | null;
}

/** "5% storting − tekor" bila satu tarif sepanjang periode; selain itu rumus umumnya. */
function rumusGaji(hari: readonly { tarifBp: number }[]): string {
  const tarif = new Set(hari.map((h) => h.tarifBp));
  if (tarif.size !== 1) return "Tarif × storting − tekor";
  const bp = [...tarif][0] ?? 0;
  return `${(bp / 100).toLocaleString("id-ID")}% storting − tekor`;
}

export function sorotGaji(g: PratinjauGaji): SorotVM {
  const lencana =
    g.halangan === "PERIODE_SUDAH_DIBAYAR"
      ? "Sudah Dibayar"
      : g.gajiBersih < 0
        ? "Minus"
        : g.halangan === "PERIODE_BELUM_BERAKHIR"
          ? "Perkiraan"
          : null;
  return {
    label: "Gaji",
    ikon: "hand-coins",
    nilai: g.gajiBersih,
    lencana,
    rumus: rumusGaji(g.hari),
    selisih: null,
    segmen: null,
    keping: [
      { label: "Gaji kotor", nilai: g.gajiKotor },
      { label: "Tekor", nilai: g.potonganTekor },
    ],
    kepingBawah: null,
  };
}

export function sorotStortingJenis(
  r: Ringkasan,
  jenis: JenisPinjaman,
  pembanding: { data: Ringkasan; label: string } | null,
): SorotVM {
  const p = r.penagihan;
  return {
    label: `Storting ${LABEL_JENIS[jenis]}`,
    ikon: "banknote-arrow-down",
    nilai: p.storting,
    lencana: p.storting < 0 ? "Minus" : null,
    rumus: `${p.jumlahSetoran} setoran · murni + pelunasan − tabungan keluar`,
    selisih: pembanding
      ? selisih(p.storting, pembanding.data.penagihan.storting, pembanding.label)
      : null,
    segmen: susunSegmen([
      { label: "Murni", nilai: p.setoranMurni },
      { label: "Pelunasan", nilai: p.setoranPelunasan },
    ]),
    keping: [
      { label: "Tagihan murni", nilai: p.setoranMurni },
      { label: "Pelunasan", nilai: p.setoranPelunasan },
    ],
    kepingBawah: { label: "Tabungan keluar", nilai: p.tabunganKeluar },
  };
}
