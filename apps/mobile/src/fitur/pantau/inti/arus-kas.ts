import type { HariKas, RincianKasJawaban } from "@opennael/contracts";

/**
 * TAB MUTASI (mode Semua) — arus kas kolektor hari ini menurut aturan-usaha
 * I1: kas lapangan + storting + tabungan masuk + admin − droping − transfer −
 * biaya tak terduga = tunai yang harus disetor. Angkanya dari server
 * (`GET /hari-kolektor`, rincian milik kolektor sendiri); di sini hanya
 * disusun menjadi baris dan keadaan hari. PURE.
 */

export interface BarisArus {
  kunci: keyof RincianKasJawaban;
  label: string;
  /** Tanda di depan label: masuk (+), keluar (−), atau titik awal. */
  tanda: "awal" | "masuk" | "keluar";
  nilai: number;
}

export function barisArusKas(r: RincianKasJawaban): BarisArus[] {
  return [
    {
      kunci: "kasLapangan",
      label: "Kas lapangan (dibawa pagi)",
      tanda: "awal",
      nilai: r.kasLapangan,
    },
    { kunci: "storting", label: "Storting", tanda: "masuk", nilai: r.storting },
    {
      kunci: "tabunganMasuk",
      label: "Tabungan masuk akad",
      tanda: "masuk",
      nilai: r.tabunganMasuk,
    },
    { kunci: "potonganAdmin", label: "Potongan admin", tanda: "masuk", nilai: r.potonganAdmin },
    { kunci: "droping", label: "Droping", tanda: "keluar", nilai: r.droping },
    { kunci: "transfer", label: "Transfer setoran", tanda: "keluar", nilai: r.transfer },
    { kunci: "biaya", label: "Biaya tak terduga", tanda: "keluar", nilai: r.biaya },
  ];
}

/**
 * Keadaan hari kolektor dari sisi kas, urut alur sehari:
 * belum absen → tidak kerja | lapangan (laporan belum dibuka) → laporan dibuka
 * (menunggu kasir) → kas diterima (terkunci, ada tekor/lebih setor).
 */
export type KeadaanKas = "belum-absen" | "tidak-kerja" | "lapangan" | "laporan" | "diterima";

export function keadaanKas(h: HariKas | undefined): KeadaanKas {
  if (!h) return "belum-absen";
  if (h.absensi === "tidak_kerja") return "tidak-kerja";
  if (h.serahTerima) return "diterima";
  if (h.laporanDibukaAt) return "laporan";
  return "lapangan";
}
