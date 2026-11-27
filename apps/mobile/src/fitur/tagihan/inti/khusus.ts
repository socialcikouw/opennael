import type { KartuTagih, Peristiwa } from "@opennael/contracts";
import { geserTanggal, hariPekanDari, TEMPO } from "@opennael/domain";
import { nominalK } from "./grid";

/**
 * ISI SLOT GRID kartu non-harian. Kartunya sama persis dengan kartu harian;
 * yang khas hanya slot di tengah:
 *   - mingguan: satu kotak per minggu sepanjang tenor + satu kabar;
 *   - tempoan: garis waktu akad → jatuh tempo (hari masuk kerja ke-6) + hitung mundur.
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

/**
 * Keadaan tempoan menurut HARI MASUK KERJA kolektor (aturan-usaha A4): nanti · segera
 * (≤ 2 hari kerja lagi) · hariini (jatuh tempo) · meleset (janji besok, hari ke-7 s/d ke-9)
 * · batas (hari ke-10: wajib lunas) · macet.
 */
export type KeadaanTempo = "nanti" | "segera" | "hariini" | "meleset" | "batas" | "macet";

export interface TempoVM {
  /** Tanggal jatuh tempo bila sudah sampai; null = masih menghitung hari kerja. */
  jatuhTempo: string | null;
  /** Hari kerja tersisa sampai jatuh tempo; 0 = hari ini; negatif = meleset sekian hari. */
  sisaHari: number;
  keadaan: KeadaanTempo;
  /** "3 HARI LAGI" (hari kerja) / "HARI INI" / "MELESET 2 HARI" / "WAJIB LUNAS" / "MACET". */
  hitungMundur: string;
  /** Bagian 6 hari kerja yang sudah berjalan, 0–1. */
  jalan: number;
  akadTeks: string;
  /** Ujung kanan garis waktu: tanggal jatuh tempo, atau "Hari Ke-6" bila belum sampai. */
  jatuhTempoTeks: string;
  /** "Kam 5 Nov", atau "hari kerja ke-6" bila belum sampai. */
  jatuhTempoHariTeks: string;
}

export function susunTempo(
  p: Pick<KartuTagih, "tanggalAkad" | "jatuhTempo" | "batasTempo" | "hariTempo" | "status">,
  hariIni: string,
): TempoVM {
  const meleset = Math.max(0, p.hariTempo - TEMPO.jatuhTempoKe);
  const sisaHari =
    p.jatuhTempo === null
      ? Math.max(1, TEMPO.jatuhTempoKe - p.hariTempo)
      : p.jatuhTempo === hariIni
        ? 0
        : -Math.max(1, meleset);
  const keadaan: KeadaanTempo =
    p.status === "macet"
      ? "macet"
      : p.batasTempo !== null && p.batasTempo <= hariIni
        ? "batas"
        : sisaHari < 0
          ? "meleset"
          : sisaHari === 0
            ? "hariini"
            : sisaHari <= 2
              ? "segera"
              : "nanti";
  const hitungMundur =
    keadaan === "macet"
      ? "MACET"
      : keadaan === "batas"
        ? "WAJIB LUNAS"
        : keadaan === "meleset"
          ? `MELESET ${-sisaHari} HARI`
          : keadaan === "hariini"
            ? "HARI INI"
            : `${sisaHari} HARI LAGI`;
  return {
    jatuhTempo: p.jatuhTempo,
    sisaHari,
    keadaan,
    hitungMundur,
    jalan: Math.max(0, Math.min(1, p.hariTempo / TEMPO.jatuhTempoKe)),
    akadTeks: ringkas(p.tanggalAkad),
    jatuhTempoTeks: p.jatuhTempo ? ringkas(p.jatuhTempo) : `Hari Ke-${TEMPO.jatuhTempoKe}`,
    jatuhTempoHariTeks: p.jatuhTempo
      ? hariRingkas(p.jatuhTempo)
      : `hari kerja ke-${TEMPO.jatuhTempoKe}`,
  };
}

/** Ringkasan JATUH TEMPO di kepala tab Tempoan (pengganti rasio bayar): jumlah nasabah saja. */
export function ringkasJatuhTempo(tempo: readonly TempoVM[]): {
  meleset: number;
  hariIni: number;
  belum: number;
  berjalan: number;
} {
  const r = { meleset: 0, hariIni: 0, belum: 0, berjalan: tempo.length };
  for (const t of tempo) {
    if (t.sisaHari < 0) r.meleset++;
    else if (t.sisaHari === 0) r.hariIni++;
    else r.belum++;
  }
  return r;
}

/**
 * Ringkasan jatuh tempo dari daftar tagih mentah: hanya yang bertempoan dihitung.
 * Tab Tempoan (Mode Kerja) dan Performa saringan Tempoan memakainya sebagai ganti rasio
 * bayar (tempoan tak ditagih setiap hari).
 */
export function jatuhTempoDari(
  pinjaman: readonly Pick<
    KartuTagih,
    "jenis" | "tanggalAkad" | "jatuhTempo" | "batasTempo" | "hariTempo" | "status"
  >[],
  hariIni: string,
) {
  return ringkasJatuhTempo(
    pinjaman.filter((p) => p.jenis === "tempoan").map((p) => susunTempo(p, hariIni)),
  );
}
