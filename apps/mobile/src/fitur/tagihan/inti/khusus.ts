import type { KartuTagih, Peristiwa } from "@opennael/contracts";
import { geserTanggal, hariPekanDari, selisihHari } from "@opennael/domain";
import { nominalK } from "./grid";

/**
 * ISI SLOT GRID kartu non-harian. Kartunya sama persis dengan kartu harian;
 * yang khas hanya slot di tengah:
 *   - mingguan: satu kotak per minggu sepanjang tenor + satu kabar;
 *   - tempoan: garis waktu akad → jatuh tempo + hitung mundur.
 */

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const ringkas = (t: string) => `${Number(t.slice(8))} ${BULAN[Number(t.slice(5, 7)) - 1]}`;
const hariRingkas = (t: string) => `${HARI[hariPekanDari(t)]} ${ringkas(t)}`;

// ---- mingguan ---------------------------------------------------------------

export type StatusKotak = "bayar" | "libur" | "lewat" | "hariini" | "nanti";

export interface KotakMinggu {
  tanggal: string;
  /** "19/10" */
  label: string;
  status: StatusKotak;
  /** "50k" bila bayar (bayar tanpa catatan, mis. salinan migrasi: "✓"), "X" libur, "-" belum. */
  teks: string;
}

export interface MingguanVM {
  kotak: KotakMinggu[];
  /** "1 minggu terlewat (12/10)" / "Tagih berikutnya Kam 5 Nov" / "Hari ini hari tagihnya". */
  kabar: string | null;
  kabarBahaya: boolean;
}

/**
 * Kotak ke-k jatuh pada akad + 7k hari (B3). Diisi berurutan: minggu yang
 * diliburkan → libur (tak dihitung, jadwal bergeser); selain itu selama masih
 * ada angsuran terbayar → bayar; sisanya lewat / hari ini / nanti menurut
 * tanggal. Nominal setoran dipasang dari yang TERAKHIR mundur — catatan
 * peristiwa selalu yang terbaru. `riwayat` undefined = belum dimuat.
 */
export function susunMingguan(
  p: Pick<KartuTagih, "tanggalAkad" | "tenor" | "angsuranKe">,
  riwayat: readonly Peristiwa[] | undefined,
  hariIni: string,
): MingguanVM {
  const libur = new Set<string>();
  const setoran: number[] = [];
  for (const e of [...(riwayat ?? [])].sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1))) {
    if (e.kategori === "libur") libur.add(e.tanggal);
    else setoran.push(e.storting);
  }
  const kotak: KotakMinggu[] = [];
  let sisaBayar = p.angsuranKe;
  let bukanLibur = 0;
  for (let k = 1; bukanLibur < p.tenor && k <= p.tenor + 12; k++) {
    const tanggal = geserTanggal(p.tanggalAkad, 7 * k);
    let status: StatusKotak;
    if (libur.has(tanggal)) status = "libur";
    else {
      bukanLibur++;
      if (sisaBayar > 0) {
        status = "bayar";
        sisaBayar--;
      } else if (tanggal < hariIni) status = "lewat";
      else if (tanggal === hariIni) status = "hariini";
      else status = "nanti";
    }
    kotak.push({
      tanggal,
      label: `${Number(tanggal.slice(8))}/${Number(tanggal.slice(5, 7))}`,
      status,
      teks: status === "libur" ? "X" : status === "bayar" ? "✓" : "-",
    });
  }
  let j = setoran.length - 1;
  for (let i = kotak.length - 1; i >= 0 && j >= 0; i--) {
    const k = kotak[i];
    if (k?.status === "bayar") k.teks = nominalK(setoran[j--] ?? 0);
  }

  const lewat = kotak.filter((k) => k.status === "lewat");
  const berikut = kotak.find((k) => k.status === "hariini" || k.status === "nanti");
  const kabar =
    lewat.length > 0
      ? `${lewat.length} minggu terlewat (${lewat.map((k) => k.label).join(", ")})`
      : berikut?.status === "hariini"
        ? "Hari ini hari tagihnya"
        : berikut
          ? `Tagih berikutnya ${hariRingkas(berikut.tanggal)}`
          : null;
  return { kotak, kabar, kabarBahaya: lewat.length > 0 };
}

// ---- tempoan ----------------------------------------------------------------

/** nanti (> 3 hari) · segera (1–3 hari) · hari ini · lewat · macet. */
export type KeadaanTempo = "nanti" | "segera" | "hariini" | "lewat" | "macet";

export interface TempoVM {
  jatuhTempo: string;
  /** Positif = belum, 0 = hari ini, negatif = lewat. */
  sisaHari: number;
  keadaan: KeadaanTempo;
  /** "H-5" / "HARI INI" / "LEWAT 2 HARI" (macet: "MACET · LEWAT 9 HARI"). */
  hitungMundur: string;
  /** Bagian jangka yang sudah berjalan, 0–1. */
  jalan: number;
  akadTeks: string;
  jatuhTempoTeks: string;
  /** "Kam 5 Nov" */
  jatuhTempoHariTeks: string;
}

export function susunTempo(
  p: Pick<KartuTagih, "tanggalAkad" | "tenor" | "jatuhTempo" | "status">,
  hariIni: string,
): TempoVM {
  const jatuhTempo = p.jatuhTempo ?? geserTanggal(p.tanggalAkad, p.tenor);
  const sisaHari = selisihHari(hariIni, jatuhTempo);
  const keadaan: KeadaanTempo =
    p.status === "macet"
      ? "macet"
      : sisaHari < 0
        ? "lewat"
        : sisaHari === 0
          ? "hariini"
          : sisaHari <= 3
            ? "segera"
            : "nanti";
  const mundur =
    sisaHari > 0 ? `H-${sisaHari}` : sisaHari === 0 ? "HARI INI" : `LEWAT ${-sisaHari} HARI`;
  const jangka = Math.max(1, selisihHari(p.tanggalAkad, jatuhTempo));
  return {
    jatuhTempo,
    sisaHari,
    keadaan,
    hitungMundur: keadaan === "macet" ? `MACET · ${mundur}` : mundur,
    jalan: Math.max(0, Math.min(1, selisihHari(p.tanggalAkad, hariIni) / jangka)),
    akadTeks: ringkas(p.tanggalAkad),
    jatuhTempoTeks: ringkas(jatuhTempo),
    jatuhTempoHariTeks: hariRingkas(jatuhTempo),
  };
}

/** Ringkasan JATUH TEMPO di kepala mode Tempoan (pengganti rasio bayar): jumlah nasabah saja. */
export function ringkasJatuhTempo(tempo: readonly TempoVM[]): {
  lewat: number;
  hariIni: number;
  pekan: number;
  berjalan: number;
} {
  const r = { lewat: 0, hariIni: 0, pekan: 0, berjalan: tempo.length };
  for (const t of tempo) {
    if (t.sisaHari < 0) r.lewat++;
    else if (t.sisaHari === 0) r.hariIni++;
    else if (t.sisaHari <= 7) r.pekan++;
  }
  return r;
}
