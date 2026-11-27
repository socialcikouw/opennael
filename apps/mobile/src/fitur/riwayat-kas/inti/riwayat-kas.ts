import type { HariKas, RiwayatHari } from "@opennael/contracts";
import { rupiah } from "@opennael/format";
import type { KartuVM, RincianVM, SorotVM } from "../../../komponen/statistik/tipe";

/**
 * RIWAYAT KAS kolektor (Mode Rekap › Menu › Riwayat Kas, 28 Nov 2026; aturan-usaha I).
 * Daftar bulan dari `GET /hari-kolektor/riwayat` (ringan: absensi, laporan, serah terima),
 * dan satu hari dari `GET /hari-kolektor?tanggal=` (rincian tunai seharusnya I1). PURE.
 */

export type KeadaanHari =
  | "tidak-kerja"
  | "diterima"
  | "laporan"
  | "lapangan"
  /** Hari lewat yang kasnya tak (lagi) tercatat diterima — penerimaan dibatalkan / buku lama. */
  | "belum-diterima";

export const LABEL_KEADAAN: Record<KeadaanHari, string> = {
  "tidak-kerja": "Tidak Kerja",
  diterima: "Diterima",
  laporan: "Laporan Dibuka",
  lapangan: "Di Lapangan",
  "belum-diterima": "Belum Diterima",
};

export function keadaanHari(h: RiwayatHari, hariIni: string): KeadaanHari {
  if (h.absensi === "tidak_kerja") return "tidak-kerja";
  if (h.serahTerima) return "diterima";
  if (h.tanggal === hariIni) return h.laporanDibukaAt ? "laporan" : "lapangan";
  return "belum-diterima";
}

export interface BarisHariVM {
  tanggal: string;
  keadaan: KeadaanHari;
  /** Tunai yang diterima kasir; null bila belum / tidak kerja. */
  diterima: number | null;
  /** "Tekor Rp 20.000" · "Lebih setor Rp 5.000" · "Pas" · alasan tidak kerja · null. */
  catatan: string | null;
  nada: "bahaya" | "sukses" | null;
}

export function barisHari(h: RiwayatHari, hariIni: string): BarisHariVM {
  const keadaan = keadaanHari(h, hariIni);
  const st = h.serahTerima;
  let catatan: string | null = null;
  let nada: BarisHariVM["nada"] = null;
  if (keadaan === "tidak-kerja") catatan = h.alasanTidakKerja;
  else if (st) {
    if (st.tekor > 0) [catatan, nada] = [`Tekor ${rupiah(st.tekor)}`, "bahaya"];
    else if (st.lebihSetor > 0)
      [catatan, nada] = [`Lebih setor ${rupiah(st.lebihSetor)}`, "sukses"];
    else catatan = "Pas";
  } else if (h.tekorLama > 0)
    [catatan, nada] = [`Tekor ${rupiah(h.tekorLama)} (buku lama)`, "bahaya"];
  return { tanggal: h.tanggal, keadaan, diterima: st?.tunaiDiterima ?? null, catatan, nada };
}

export interface RingkasBulan {
  diterima: number;
  /** Tekor serah terima + arsip tekor buku lama. */
  tekor: number;
  lebihSetor: number;
  hariDiterima: number;
  hariTidakKerja: number;
}

export function ringkasBulan(daftar: readonly RiwayatHari[]): RingkasBulan {
  const r: RingkasBulan = {
    diterima: 0,
    tekor: 0,
    lebihSetor: 0,
    hariDiterima: 0,
    hariTidakKerja: 0,
  };
  for (const h of daftar) {
    if (h.absensi === "tidak_kerja") r.hariTidakKerja++;
    r.tekor += h.tekorLama;
    if (!h.serahTerima) continue;
    r.hariDiterima++;
    r.diterima += h.serahTerima.tunaiDiterima;
    r.tekor += h.serahTerima.tekor;
    r.lebihSetor += h.serahTerima.lebihSetor;
  }
  return r;
}

/** Kartu hitam bulan: setoran ke kasir, dengan tekor (memotong gaji, J3) & lebih setor. */
export function sorotBulan(r: RingkasBulan): SorotVM {
  return {
    label: "Setoran ke Kasir",
    ikon: "wallet",
    nilai: r.diterima,
    lencana: r.tekor > 0 ? "Ada Tekor" : null,
    rumus: `${r.hariDiterima} hari diterima · ${r.hariTidakKerja} hari tidak kerja`,
    selisih: null,
    segmen: null,
    keping: [
      { label: "Tekor", nilai: r.tekor },
      { label: "Lebih setor", nilai: r.lebihSetor },
    ],
    kepingBawah: null,
  };
}

/** Kartu hitam satu hari: tunai seharusnya, lalu yang diterima & selisihnya. */
export function sorotHari(h: HariKas): SorotVM {
  const st = h.serahTerima;
  const seharusnya = st?.tunaiSeharusnya ?? h.rincian?.tunaiSeharusnya ?? 0;
  return {
    label: "Tunai Seharusnya",
    ikon: "wallet",
    nilai: seharusnya,
    lencana: st
      ? st.tekor > 0
        ? "Tekor"
        : st.lebihSetor > 0
          ? "Lebih Setor"
          : "Pas"
      : "Belum Diterima",
    rumus: st
      ? `Dibekukan saat diterima ${st.diterimaOleh.nama}`
      : "Kas lapangan + masuk − keluar (I1)",
    selisih: null,
    segmen: null,
    keping: st
      ? [
          { label: "Diterima kasir", nilai: st.tunaiDiterima },
          { label: st.tekor > 0 ? "Tekor" : "Lebih setor", nilai: st.tekor || st.lebihSetor },
        ]
      : [
          { label: "Kas lapangan", nilai: h.kasLapangan },
          { label: "Uang jalan", nilai: h.uangJalan },
        ],
    kepingBawah: null,
  };
}

/** Arus kas satu hari (I1): masuk positif, keluar negatif. null = tak ada rincian. */
export function kartuArus(h: HariKas): KartuVM | null {
  const r = h.rincian;
  if (!r) return null;
  const rincian: RincianVM[] = [
    { ikon: "wallet", label: "Kas lapangan (dibawa pagi)", nilai: r.kasLapangan },
    { ikon: "banknote-arrow-down", label: "Storting", nilai: r.storting },
    { ikon: "piggy-bank", label: "Tabungan masuk akad", nilai: r.tabunganMasuk },
    { ikon: "file-text", label: "Potongan admin", nilai: r.potonganAdmin },
    { ikon: "banknote-arrow-up", label: "Droping", nilai: -r.droping },
    { ikon: "smartphone", label: "Transfer setoran", nilai: -r.transfer },
    { ikon: "circle-alert", label: "Biaya tak terduga", nilai: -r.biaya },
  ];
  return {
    kunci: "arus",
    judul: "Arus Kas",
    ikon: "arrow-left-right",
    nilai: r.tunaiSeharusnya,
    rumus: "Kas lapangan + storting + tabungan + admin − droping − transfer − biaya",
    meta: `Uang jalan ${rupiah(h.uangJalan)} tidak ikut disetor`,
    selisih: null,
    segmen: null,
    grid: false,
    rincian,
    kaki: null,
    daftar: null,
  };
}
