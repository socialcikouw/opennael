import type { KartuTagih } from "@opennael/contracts";
import {
  hariPekanDari,
  kunciWilayah,
  nomorGulungMinimal,
  type StatusGulung,
  statusGulung,
  tolakLibur,
  wajibDitagihHariIni,
  waktuKantor,
  type ZonaWaktu,
} from "@opennael/domain";
import { tanggalBertahun } from "@opennael/format";
import type { NamaIkon } from "../../../komponen/ui/daftar-ikon";
import { type BahanGrid, type BarisPekan, nominalK, susunGrid } from "./grid";
import { type MingguanVM, susunMingguan, susunTempo, type TempoVM } from "./khusus";

/**
 * VIEW MODEL KARTU NASABAH (layar Tagihan) — semua keputusan tampilan dihitung
 * sekali per data di sini; komponen kartu hanya mencetak teks & memilih nada
 * warna. Dibaca dari atas ke bawah sesuai pertanyaan kolektor di depan rumah:
 *   1. SIAPA — lingkaran angsuran ke-, nama, lencana; di kartu: kampung,
 *      tanggal & jam akad, pinjaman ke-, Tabungan (rahasia);
 *   2. SEJAUH MANA — kalimat sinyal gulung ("Bisa Digulung");
 *   3. BAGAIMANA — grid setoran sebulan (harian);
 *   4. BERAPA & MAU DIAPAKAN — Pokok · Sisa Saldo, lalu Gulung · Libur dan
 *      Bayar bernominal (Lunasi di balik kartu).
 */

/** Ember kartu hari ini: belum ditagih · droping (akad hari ini) · sudah ditagih (bayar/libur). */
export type Ember = "belum" | "droping" | "sudah";

/** Nada lencana: merah (macet), hijau (baru / gulung naik), kuning (gulung turun), abu. */
export type Nada = "merah" | "hijau" | "kuning" | "abu";

export interface KartuVM {
  id: string;
  p: KartuTagih;
  ember: Ember;
  /** Belum ditagih DAN wajib hari ini (B6) — sisa yang menahan laporan. */
  wajib: boolean;
  nama: string;
  /** "Budi Santoso" — nama berhuruf judul untuk kepala kartu. */
  namaJudul: string;
  /** "pule barat · mingguan 8×" (kartu ringkas). */
  subjudul: string;
  /** "12" — angsuran yang sudah lunas, isi lingkaran di depan nama. */
  angsuranKeTeks: string;
  /** "Pinjaman Ke-3" atau "Pinjaman Ke-1 · mingguan 8×". */
  pinjamanKeTeks: string;
  lencana: { teks: string; nada: Nada; ikon: NamaIkon } | null;
  /** "1 Sep 26 • 15.00"; hanya tanggal bila jam akad tak diketahui (salinan migrasi). */
  akadTeks: string;
  /** Mingguan: hari tagihnya ("Rabu"); selain itu null. */
  hariTagih: string | null;
  progres: {
    status: StatusGulung;
    /** Alasan terperinci — dibaca saat tombol Gulung yang mati diketuk. */
    petunjuk: string;
    /** Sinyal di kartu: "Bisa Digulung" · "Belum Bisa Digulung" · "Tidak Bisa Digulung" (macet). */
    sinyal: string;
  } | null;
  /** Grid setoran sebulan — hanya harian di ember belum. */
  grid: BarisPekan[] | null;
  /** Slot grid mingguan: kotak per minggu + kabar. */
  mingguan: MingguanVM | null;
  /** Slot grid tempoan: garis waktu menuju jatuh tempo. */
  tempo: TempoVM | null;
  /** Tanpa "Rp" — kartu ringkas. */
  angsuranTeks: string;
  saldoTeks: string;
  /** Dengan "Rp ": "Rp 300.000". */
  pokokRp: string;
  angsuranRp: string;
  saldoRp: string;
  tabunganRp: string;
  /** Tombol transaksi tampil (ember belum). */
  aksi: boolean;
  /** "Rp 50.000" — nominal di tombol Bayar (tempoan: saldo, tombolnya Lunasi). */
  bayarTeks: string;
  sekaliBayar: boolean;
  tampilkanLibur: boolean;
  /** Alasan tombol Libur mati (G1–G3); null = boleh. */
  alasanLibur: string | null;
  /** Kartu ringkas ember sudah: "SUDAH BAYAR • 50K" / "LIBUR HARI INI". */
  judulSudah: string | null;
  /** Bahan pencarian (nama & kampung, tanpa beda huruf/spasi). */
  cari: string;
}

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const ribuan = (n: number) => n.toLocaleString("id-ID");
export const rupiahPendek = (n: number) => `Rp ${ribuan(n)}`;

const SINGKATAN = new Set(["RT", "RW"]);
const ROMAWI = /^(?:I{1,3}|IV|V|VI{1,3}|IX|X)$/i;

/**
 * "BUDI SANTOSO" / "pule barat" → "Budi Santoso" / "Pule Barat". Kata ber-angka
 * apa adanya ("03"), angka Romawi dan RT/RW tetap kapital ("Dusun II", "RT 03"),
 * huruf setelah tanda hubung ikut kapital ("Sri-Rahayu").
 */
export function judulKata(teks: string): string {
  const huruf = (k: string) =>
    k === "" ? k : k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
  return teks
    .trim()
    .split(/\s+/)
    .map((kata) => {
      if (/\d/.test(kata)) return kata;
      if (SINGKATAN.has(kata.toUpperCase()) || ROMAWI.test(kata)) return kata.toUpperCase();
      return kata.split("-").map(huruf).join("-");
    })
    .join(" ");
}

/** "15.00" — jam dinding kantor dari waktu ISO (zona Indonesia berselisih jam tetap). */
function jamDinding(iso: string, zona: ZonaWaktu): string {
  const { menit } = waktuKantor(new Date(iso), zona);
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${dua(Math.floor(menit / 60))}.${dua(menit % 60)}`;
}

function ember(p: KartuTagih, hariIni: string): Ember {
  if (p.tanggalAkad === hariIni && p.asal !== "migrasi") return "droping";
  return p.hariIni ? "sudah" : "belum";
}

function lencana(p: KartuTagih, e: Ember): KartuVM["lencana"] {
  if (p.status === "macet") return { teks: "Macet", nada: "merah", ikon: "triangle-alert" };
  if (e !== "droping") return null;
  if (p.asal !== "gulung") return { teks: "Baru", nada: "hijau", ikon: "user-plus" };
  if (p.jenisGulung === "naik") return { teks: "Gulung naik", nada: "hijau", ikon: "trending-up" };
  if (p.jenisGulung === "turun")
    return { teks: "Gulung turun", nada: "kuning", ikon: "trending-down" };
  return { teks: "Gulung tetap", nada: "abu", ikon: "repeat" };
}

const PETUNJUK: Record<StatusGulung, (ambang: number) => string> = {
  boleh: () => "Boleh digulung",
  belum: (ambang) => `Gulung mulai angsuran ke-${ambang}`,
  terkunci: () => "Macet · tak bisa digulung",
};

const SINYAL: Record<StatusGulung, string> = {
  boleh: "Bisa Digulung",
  belum: "Belum Bisa Digulung",
  terkunci: "Tidak Bisa Digulung",
};

function progres(p: KartuTagih, status: StatusGulung): NonNullable<KartuVM["progres"]> {
  const sinyal = SINYAL[status];
  if (p.jenis === "harian") {
    return { status, petunjuk: PETUNJUK[status](nomorGulungMinimal(p.pinjamanKe)), sinyal };
  }
  // Mingguan: tanpa ambang — boleh digulung kapan saja selama masih ditagih (E5).
  return {
    status,
    petunjuk: status === "boleh" ? "Mingguan · boleh digulung kapan saja" : "Tak bisa digulung",
    sinyal,
  };
}

function judulSudah(p: KartuTagih): string | null {
  if (p.hariIni?.jenis === "libur") return "LIBUR HARI INI";
  if (p.hariIni?.jenis === "angsuran")
    return `SUDAH BAYAR • ${nominalK(p.hariIni.storting).toUpperCase()}`;
  return null;
}

function susun(p: KartuTagih, hariIni: string, bahan: BahanGrid, zona: ZonaWaktu): KartuVM {
  const e = ember(p, hariIni);
  const status = statusGulung(p);
  const tempoan = p.jenis === "tempoan";
  const ekor =
    p.jenis === "mingguan"
      ? ` · mingguan ${p.tenor}×`
      : tempoan
        ? ` · tempoan ${p.tenor} hari`
        : "";
  const libur = tolakLibur(p, hariIni);
  return {
    id: p.id,
    p,
    ember: e,
    wajib: e === "belum" && wajibDitagihHariIni(p, hariIni),
    nama: p.nasabah.nama,
    namaJudul: judulKata(p.nasabah.nama),
    subjudul: `${p.nasabah.kampung.toLowerCase()}${ekor}`,
    angsuranKeTeks: String(p.angsuranKe),
    pinjamanKeTeks: `Pinjaman Ke-${p.pinjamanKe}${ekor}`,
    lencana: lencana(p, e),
    akadTeks: p.waktuAkad
      ? `${tanggalBertahun(p.tanggalAkad)} • ${jamDinding(p.waktuAkad, zona)}`
      : tanggalBertahun(p.tanggalAkad),
    hariTagih: p.jenis === "mingguan" ? (NAMA_HARI[hariPekanDari(p.tanggalAkad)] ?? null) : null,
    progres: e === "belum" && !tempoan ? progres(p, status) : null,
    grid: e === "belum" && p.jenis === "harian" ? susunGrid(bahan, p) : null,
    mingguan:
      e === "belum" && p.jenis === "mingguan"
        ? susunMingguan(p, bahan.riwayat.get(p.id), hariIni)
        : null,
    tempo: e === "belum" && tempoan ? susunTempo(p, hariIni) : null,
    angsuranTeks: ribuan(p.angsuran),
    saldoTeks: ribuan(p.saldo),
    pokokRp: rupiahPendek(p.pokok),
    angsuranRp: rupiahPendek(p.angsuran),
    saldoRp: rupiahPendek(p.saldo),
    tabunganRp: rupiahPendek(p.tabungan),
    aksi: e === "belum",
    bayarTeks: rupiahPendek(tempoan ? p.saldo : p.angsuran),
    sekaliBayar: tempoan,
    tampilkanLibur: !tempoan,
    alasanLibur: libur?.pesan ?? null,
    judulSudah: e === "sudah" ? judulSudah(p) : null,
    cari: `${kunciWilayah(p.nasabah.nama)} ${kunciWilayah(p.nasabah.kampung)}`,
  };
}

/**
 * Cache per OBJEK data pinjaman + bahan grid + tanggal: VM yang masukannya tak
 * berubah dipakai ulang, jadi kartu `memo` melewati render saat mengetik di
 * kolom cari, ganti tab, atau transaksi di kartu lain.
 */
const simpanan = new WeakMap<
  KartuTagih,
  { hariIni: string; bahan: BahanGrid; zona: ZonaWaktu; vm: KartuVM }
>();

export function kartuVM(
  p: KartuTagih,
  hariIni: string,
  bahan: BahanGrid,
  zona: ZonaWaktu,
): KartuVM {
  const lalu = simpanan.get(p);
  if (lalu && lalu.hariIni === hariIni && lalu.bahan === bahan && lalu.zona === zona)
    return lalu.vm;
  const vm = susun(p, hariIni, bahan, zona);
  simpanan.set(p, { hariIni, bahan, zona, vm });
  return vm;
}
