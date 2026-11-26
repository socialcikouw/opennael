import type { Ringkasan } from "@opennael/contracts";
import type { JenisPinjaman } from "@opennael/domain";
import { LABEL_JENIS, rupiah } from "@opennael/format";
import type { NamaIkon } from "../../../komponen/ui/daftar-ikon";
import { type SegmenVM, type SelisihVM, selisih, susunSegmen } from "./komposisi";

/**
 * KARTU RINCIAN RINGKASAN — satu kartu per pos uang, dari `GET /ringkasan` satu periode:
 *
 *   [ikon] Judul                         ▲ 12% dari Oktober 1–27
 *   Rp 12.500.000                        ← angka besar
 *   murni + pelunasan − tabungan keluar  ← rumus: angka bisa dicek dengan mata
 *   ▬▬▬▬▬▬░░░  Harian 72% · Mingguan 28% ← bar komposisi (bila tersusun dari bagian)
 *   [rincian 2×2 atau baris]
 *   ───────  Tabungan keluar  Rp …       ← kaki
 *
 * Semua jenis: Storting · Droping · Potongan Akad · Operasional · Setoran Sore (periode
 * lebih dari hari ini; hari ini setoran sore ada di kartu sorot Mutasi Kas). Satu jenis:
 * Droping · Potongan Akad (Storting jenis itu jadi kartu sorot; kas tak berjenis).
 * Kartu Storting & Droping hari ini bisa diketuk → daftar per nasabah. Angka mentah
 * (rupiah) — komponen memformat. PURE.
 */

export interface RincianVM {
  ikon: NamaIkon;
  label: string;
  nilai: number;
  /** Warna nilai: bahaya (tekor, minus) / sukses (lebih setor). */
  nada?: "bahaya" | "sukses";
}

export type KunciKartu = "storting" | "droping" | "potongan" | "operasional" | "setoran";

export interface KartuVM {
  kunci: KunciKartu;
  judul: string;
  ikon: NamaIkon;
  nilai: number;
  rumus: string | null;
  /** Keterangan kecil di bawah rumus: "12 setoran · rata-rata Rp 410.000 per hari kerja". */
  meta: string | null;
  selisih: SelisihVM | null;
  segmen: SegmenVM[] | null;
  rincian: RincianVM[];
  /** 2×2 keping (4 rincian) atau daftar baris. */
  grid: boolean;
  kaki: RincianVM | null;
  /** Bisa diketuk → daftar per nasabah (hanya periode Hari Ini). */
  daftar: "storting" | "droping" | null;
}

export interface BahanKartu {
  data: Ringkasan;
  jenis: JenisPinjaman | null;
  hariIni: boolean;
  /** Angka periode pembanding sepadan (jenis yang sama); null = tak dibandingkan / belum ada. */
  pembanding: { data: Ringkasan; label: string } | null;
  /** Biaya tak terduga hari ini satu per satu (kartu Operasional Hari Ini). */
  biayaHariIni?: readonly { keterangan: string; nominal: number }[];
}

const bandingkan = (b: BahanKartu, pilih: (r: Ringkasan) => number) =>
  b.pembanding ? selisih(pilih(b.data), pilih(b.pembanding.data), b.pembanding.label) : null;

export function kartuStorting(b: BahanKartu): KartuVM {
  const p = b.data.penagihan;
  const hariKerja = b.data.kasLapangan.hariKerja;
  const meta = [
    `${p.jumlahSetoran} setoran`,
    !b.hariIni && b.jenis === null && hariKerja > 0
      ? `rata-rata ${rupiah(Math.round(p.storting / hariKerja))} per hari kerja`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    kunci: "storting",
    judul: "Storting",
    ikon: "banknote-arrow-down",
    nilai: p.storting,
    rumus: "Murni + pelunasan − tabungan keluar",
    meta,
    selisih: bandingkan(b, (r) => r.penagihan.storting),
    // Semua jenis: dari jenis mana storting datang. Satu jenis: cara bayarnya.
    segmen:
      b.jenis === null
        ? susunSegmen(
            b.data.perJenis.map((j) => ({ label: LABEL_JENIS[j.jenis], nilai: j.storting })),
          )
        : susunSegmen([
            { label: "Tunai", nilai: p.storting - p.transfer },
            { label: "Transfer", nilai: p.transfer },
          ]),
    grid: true,
    rincian: [
      { ikon: "banknote", label: "Tagihan murni", nilai: p.setoranMurni },
      { ikon: "check-check", label: "Pelunasan", nilai: p.setoranPelunasan },
      { ikon: "wallet", label: "Tunai", nilai: p.storting - p.transfer },
      { ikon: "smartphone", label: "Transfer", nilai: p.transfer },
    ],
    kaki: { ikon: "piggy-bank", label: "Tabungan keluar", nilai: p.tabunganKeluar },
    daftar: b.hariIni ? "storting" : null,
  };
}

export function kartuDroping(b: BahanKartu): KartuVM {
  const a = b.data.akad;
  return {
    kunci: "droping",
    judul: "Droping",
    ikon: "banknote-arrow-up",
    nilai: a.droping,
    rumus: "Drop baru + drop gulung",
    meta: `${a.jumlahAkad} akad`,
    selisih: bandingkan(b, (r) => r.akad.droping),
    segmen: susunSegmen([
      { label: "Baru", nilai: a.dropBaru },
      { label: "Gulung", nilai: a.dropGulung },
    ]),
    grid: true,
    rincian: [
      { ikon: "user-plus", label: "Drop baru", nilai: a.dropBaru },
      { ikon: "repeat", label: "Drop gulung", nilai: a.dropGulung },
      { ikon: "hand-coins", label: "Dicairkan", nilai: a.pencairan },
      { ikon: "trending-down", label: "Pokok berkurang", nilai: a.pokokBerkurang },
    ],
    kaki: null,
    daftar: b.hariIni ? "droping" : null,
  };
}

/** Potongan akad; null untuk tempoan (dicairkan 100%, tak ada potongan — A3). */
export function kartuPotongan(b: BahanKartu): KartuVM | null {
  if (b.jenis === "tempoan") return null;
  const a = b.data.akad;
  return {
    kunci: "potongan",
    judul: "Potongan Akad",
    ikon: "scissors",
    nilai: a.potonganAdmin + a.tabunganMasuk,
    rumus: "Admin + tabungan awal",
    meta: b.jenis === "mingguan" ? "Mingguan: admin 10%, tanpa tabungan" : null,
    selisih: null,
    segmen: susunSegmen([
      { label: "Admin", nilai: a.potonganAdmin },
      { label: "Tabungan", nilai: a.tabunganMasuk },
    ]),
    grid: false,
    rincian: [
      { ikon: "file-text", label: "Admin", nilai: a.potonganAdmin },
      { ikon: "piggy-bank", label: "Tabungan awal", nilai: a.tabunganMasuk },
    ],
    kaki: null,
    daftar: null,
  };
}

export function kartuOperasional(b: BahanKartu): KartuVM {
  const k = b.data.kasLapangan;
  const biaya: RincianVM[] =
    b.hariIni && b.biayaHariIni && b.biayaHariIni.length > 0
      ? b.biayaHariIni.map((x) => ({ ikon: "circle-alert", label: x.keterangan, nilai: x.nominal }))
      : [{ ikon: "circle-alert", label: "Biaya tak terduga", nilai: k.biayaTakTerduga }];
  return {
    kunci: "operasional",
    judul: "Operasional",
    ikon: "motorbike",
    nilai: k.uangJalan + k.biayaTakTerduga,
    rumus: "Uang jalan + biaya tak terduga",
    meta: b.hariIni ? null : `${k.hariKerja} hari kerja`,
    selisih: null,
    segmen: susunSegmen([
      { label: "Uang jalan", nilai: k.uangJalan },
      { label: "Tak terduga", nilai: k.biayaTakTerduga },
    ]),
    grid: false,
    rincian: [{ ikon: "motorbike", label: "Uang jalan", nilai: k.uangJalan }, ...biaya],
    kaki: null,
    daftar: null,
  };
}

/** Nilai positif diberi warna arti; nol tetap warna teks biasa. */
const nadaBila = (n: number, nada: "bahaya" | "sukses"): Pick<RincianVM, "nada"> =>
  n > 0 ? { nada } : {};

/** Setoran sore ke kasir sepanjang periode (aturan-usaha I2): tunai diterima, tekor, lebih. */
export function kartuSetoran(b: BahanKartu): KartuVM {
  const k = b.data.kasLapangan;
  return {
    kunci: "setoran",
    judul: "Setoran Sore",
    ikon: "wallet",
    nilai: k.tunaiDiterima,
    rumus: "Tunai yang diterima kasir",
    meta: `${k.hariKerja} hari kerja`,
    selisih: null,
    segmen: null,
    grid: false,
    rincian: [
      { ikon: "wallet", label: "Kas lapangan dibawa", nilai: k.kasLapangan },
      { ikon: "smartphone", label: "Transfer", nilai: k.transfer },
      { ikon: "triangle-alert", label: "Tekor", nilai: k.tekor, ...nadaBila(k.tekor, "bahaya") },
      {
        ikon: "circle-check",
        label: "Lebih setor",
        nilai: k.lebihSetor,
        ...nadaBila(k.lebihSetor, "sukses"),
      },
    ],
    kaki: null,
    daftar: null,
  };
}

/** Kartu-kartu di bawah kartu sorot, urut. */
export function susunKartu(b: BahanKartu): KartuVM[] {
  const kartu: (KartuVM | null)[] =
    b.jenis === null
      ? [
          kartuStorting(b),
          kartuDroping(b),
          kartuPotongan(b),
          kartuOperasional(b),
          b.hariIni ? null : kartuSetoran(b),
        ]
      : [kartuDroping(b), kartuPotongan(b)];
  return kartu.filter((k): k is KartuVM => k !== null);
}
