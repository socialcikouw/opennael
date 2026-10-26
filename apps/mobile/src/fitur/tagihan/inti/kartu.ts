import type { KartuTagih } from "@opennael/contracts";
import {
  hariPekanDari,
  kunciWilayah,
  nomorGulungMinimal,
  type StatusGulung,
  statusGulung,
  tolakLibur,
  wajibDitagihHariIni,
} from "@opennael/domain";
import type { NamaIkon } from "../../../komponen/ikon";
import { type BahanGrid, type BarisPekan, nominalK, susunGrid } from "./grid";

/**
 * VIEW MODEL KARTU NASABAH (layar Tagihan) — semua keputusan tampilan dihitung
 * sekali per data di sini; komponen kartu hanya mencetak teks & memilih nada
 * warna. Dibaca dari atas ke bawah sesuai pertanyaan kolektor di depan rumah:
 *   1. SIAPA — lingkaran pinjaman ke-, nama, kampung, lencana, tanggal akad;
 *   2. SEJAUH MANA — kotak angsuran ke-, bilah kemajuan, garis ambang gulung,
 *      dan kalimat sinyal gulungnya;
 *   3. BAGAIMANA — grid setoran sebulan (harian);
 *   4. BERAPA & MAU DIAPAKAN — Pokok · Saldo · Tabungan (rahasia), lalu
 *      Gulung · Libur dan Bayar bernominal (Lunasi di balik kartu).
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
  /** "pule barat · mingguan 8×" */
  subjudul: string;
  /** "3x" — pinjaman ke-. */
  lingkaran: string;
  lencana: { teks: string; nada: Nada; ikon: NamaIkon } | null;
  /** Tanggal akad, "5 Jun 26". */
  tanggalTeks: string;
  /** Mingguan: hari tagihnya ("Rabu"); selain itu null. */
  hariTagih: string | null;
  progres: {
    status: StatusGulung;
    /** 0–1. */
    isi: number;
    /** Garis angsuran pertama yang boleh digulung (0–1); null = tanpa ambang. */
    ambang: number | null;
    kotak: string;
    petunjuk: string;
    ikon: NamaIkon;
  } | null;
  /** Grid setoran sebulan — hanya harian di ember belum. */
  grid: BarisPekan[] | null;
  pokokTeks: string;
  angsuranTeks: string;
  tabunganTeks: string;
  saldoTeks: string;
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

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const ribuan = (n: number) => n.toLocaleString("id-ID");
export const rupiahPendek = (n: number) => `Rp ${ribuan(n)}`;

function tanggalPendek(tanggal: string): string {
  const [t = "", b = "1", h = "1"] = tanggal.split("-");
  return `${Number(h)} ${BULAN[Number(b) - 1]} ${t.slice(2)}`;
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

const PETUNJUK: Record<StatusGulung, { ikon: NamaIkon; teks: (ambang: number) => string }> = {
  boleh: { ikon: "circle-check", teks: () => "Boleh digulung" },
  belum: { ikon: "clock", teks: (ambang) => `Gulung mulai angsuran ke-${ambang}` },
  terkunci: { ikon: "lock", teks: () => "Macet · tak bisa digulung" },
};

function progres(p: KartuTagih, status: StatusGulung): NonNullable<KartuVM["progres"]> {
  if (p.jenis === "harian") {
    const ambang = nomorGulungMinimal(p.pinjamanKe);
    const tenor = Math.max(p.tenor, 1);
    return {
      status,
      isi: Math.min(p.angsuranKe / tenor, 1),
      ambang: Math.min(ambang / tenor, 1),
      kotak: String(p.angsuranKe),
      petunjuk: PETUNJUK[status].teks(ambang),
      ikon: PETUNJUK[status].ikon,
    };
  }
  // Mingguan: tanpa ambang — boleh digulung kapan saja selama masih ditagih (E5).
  return {
    status,
    isi: Math.min(p.angsuranKe / Math.max(p.tenor, 1), 1),
    ambang: null,
    kotak: String(p.angsuranKe),
    petunjuk: status === "boleh" ? "Mingguan · boleh digulung kapan saja" : "Tak bisa digulung",
    ikon: status === "boleh" ? "circle-check" : "lock",
  };
}

function judulSudah(p: KartuTagih): string | null {
  if (p.hariIni?.jenis === "libur") return "LIBUR HARI INI";
  if (p.hariIni?.jenis === "angsuran")
    return `SUDAH BAYAR • ${nominalK(p.hariIni.storting).toUpperCase()}`;
  return null;
}

function susun(p: KartuTagih, hariIni: string, bahan: BahanGrid): KartuVM {
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
    subjudul: `${p.nasabah.kampung.toLowerCase()}${ekor}`,
    lingkaran: `${p.pinjamanKe}x`,
    lencana: lencana(p, e),
    tanggalTeks: tanggalPendek(p.tanggalAkad),
    hariTagih: p.jenis === "mingguan" ? (NAMA_HARI[hariPekanDari(p.tanggalAkad)] ?? null) : null,
    progres: e === "belum" && !tempoan ? progres(p, status) : null,
    grid: e === "belum" && p.jenis === "harian" ? susunGrid(bahan, p) : null,
    pokokTeks: ribuan(p.pokok),
    angsuranTeks: ribuan(p.angsuran),
    tabunganTeks: ribuan(p.tabungan),
    saldoTeks: ribuan(p.saldo),
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
const simpanan = new WeakMap<KartuTagih, { hariIni: string; bahan: BahanGrid; vm: KartuVM }>();

export function kartuVM(p: KartuTagih, hariIni: string, bahan: BahanGrid): KartuVM {
  const lalu = simpanan.get(p);
  if (lalu && lalu.hariIni === hariIni && lalu.bahan === bahan) return lalu.vm;
  const vm = susun(p, hariIni, bahan);
  simpanan.set(p, { hariIni, bahan, vm });
  return vm;
}
