import type { Portofolio, PortofolioJenis } from "@opennael/contracts";
import type { JenisPinjaman } from "@opennael/domain";
import { LABEL_JENIS, rupiah } from "@opennael/format";
import { selisih, susunSegmen } from "../../../komponen/statistik/komposisi";
import type { KartuVM, SorotVM } from "../../../komponen/statistik/tipe";
import {
  type Pembanding,
  pembandingUntuk,
  piutangAktif,
  portofolioUntuk,
  URUTAN_JENIS,
} from "./portofolio";

/**
 * KARTU PORTOFOLIO (rombak 28 Nov 2026, permintaan pemilik: profesional, tiap angka jelas &
 * ber-delta bulan ini vs bulan lalu):
 *   - POSISI (saldo, nasabah aktif, target angsuran) dibanding POTRET AKHIR BULAN LALU;
 *   - ARUS (lunas, macet baru, pokok lunas, tabungan keluar, pokok berkurang) bulan ini
 *     dibanding rentang sepadan bulan lalu;
 *   - warna delta = arti: saldo/berjalan naik hijau, macet naik merah;
 *   - Tabungan Nasabah & Diputihkan tanpa delta (tabungan tak dipotret harian; pemutihan jarang).
 * Kartu: sorot Saldo Akhir · Per Jenis (Semua) · Nasabah Aktif · Target Angsuran · Tabungan ·
 * Penyelesaian Piutang (bulan ini) · Diputihkan (bila ada). PURE.
 */

const vsPotret = (
  sekarang: number,
  dulu: number | undefined,
  pb: Pembanding,
  opsi?: { naikBaik?: boolean; satuan?: string },
) => (dulu === undefined ? null : selisih(sekarang, dulu, pb.labelPotret, opsi));

const vsLalu = (
  sekarang: number,
  dulu: number,
  pb: Pembanding,
  opsi?: { naikBaik?: boolean; satuan?: string },
) => selisih(sekarang, dulu, pb.labelArus, opsi);

export function sorotSaldoAkhir(p: PortofolioJenis, pb: Pembanding): SorotVM {
  const aktif = piutangAktif(p);
  const t = pb.potret;
  const persenMacet = aktif.saldo > 0 ? Math.round((p.macet.saldo / aktif.saldo) * 100) : 0;
  return {
    label: "Saldo Akhir",
    ikon: "chart-pie",
    nilai: aktif.saldo,
    lencana: p.macet.saldo > 0 ? `${persenMacet < 1 ? "<1" : persenMacet}% macet` : null,
    rumus: `Piutang yang masih di lapangan · ${aktif.jumlah} pinjaman`,
    selisih: vsPotret(aktif.saldo, t ? t.saldoBerjalan + t.saldoMacet : undefined, pb),
    segmen: susunSegmen([
      { label: "Berjalan", nilai: p.berjalan.saldo },
      { label: "Macet", nilai: p.macet.saldo },
    ]),
    keping: [
      {
        label: "Saldo berjalan",
        nilai: p.berjalan.saldo,
        selisih: vsPotret(p.berjalan.saldo, t?.saldoBerjalan, pb),
      },
      {
        label: "Saldo macet",
        nilai: p.macet.saldo,
        selisih: vsPotret(p.macet.saldo, t?.saldoMacet, pb, { naikBaik: false }),
      },
    ],
    kepingBawah: null,
  };
}

/** Saldo aktif dipecah per jenis — hanya saat Semua Jenis. */
export function kartuPerJenis(data: Portofolio): KartuVM {
  const semua = piutangAktif(portofolioUntuk(data, null));
  return {
    kunci: "per-jenis",
    judul: "Per Jenis",
    ikon: "layout-dashboard",
    nilai: semua.saldo,
    rumus: "Saldo aktif tiap jenis pinjaman",
    meta: null,
    selisih: null,
    segmen: susunSegmen(
      URUTAN_JENIS.map((j) => ({ label: LABEL_JENIS[j], nilai: piutangAktif(data[j]).saldo })),
    ),
    grid: false,
    rincian: URUTAN_JENIS.map((j) => {
      const a = piutangAktif(data[j]);
      const pb = pembandingUntuk(data.pembanding, j);
      const t = pb.potret;
      return {
        ikon:
          j === "harian" ? "calendar-days" : j === "mingguan" ? "calendar-range" : "calendar-clock",
        label: `${LABEL_JENIS[j]} · ${a.jumlah} orang${a.macet > 0 ? ` (${a.macet} macet)` : ""}`,
        nilai: a.saldo,
        selisih: vsPotret(a.saldo, t ? t.saldoBerjalan + t.saldoMacet : undefined, pb),
      };
    }),
    kaki: null,
    daftar: null,
  };
}

export function kartuNasabah(p: PortofolioJenis, pb: Pembanding): KartuVM {
  const t = pb.potret;
  const aktif = p.berjalan.jumlah + p.macet.jumlah;
  return {
    kunci: "nasabah",
    judul: "Nasabah Aktif",
    ikon: "users",
    nilai: aktif,
    satuan: "nasabah",
    rumus: "Berjalan + macet",
    meta: `Lunas sepanjang masa: ${p.lunas.jumlah} pinjaman`,
    selisih: vsPotret(aktif, t ? t.jumlahBerjalan + t.jumlahMacet : undefined, pb, {
      satuan: "nasabah",
    }),
    segmen: susunSegmen([
      { label: "Berjalan", nilai: p.berjalan.jumlah },
      { label: "Macet", nilai: p.macet.jumlah },
    ]),
    grid: false,
    rincian: [
      {
        ikon: "circle-check",
        label: "Berjalan",
        nilai: p.berjalan.jumlah,
        satuan: "orang",
        selisih: vsPotret(p.berjalan.jumlah, t?.jumlahBerjalan, pb, { satuan: "orang" }),
      },
      {
        ikon: "triangle-alert",
        label: "Macet",
        nilai: p.macet.jumlah,
        satuan: "orang",
        ...(p.macet.jumlah > 0 ? { nada: "bahaya" as const } : {}),
        selisih: vsPotret(p.macet.jumlah, t?.jumlahMacet, pb, { naikBaik: false, satuan: "orang" }),
      },
      {
        ikon: "circle-alert",
        label: "Macet baru bulan ini",
        nilai: pb.ini.macetBaru,
        satuan: "orang",
        selisih: vsLalu(pb.ini.macetBaru, pb.lalu.macetBaru, pb, {
          naikBaik: false,
          satuan: "orang",
        }),
      },
      {
        ikon: "badge-check",
        label: "Lunas bulan ini",
        nilai: pb.ini.lunas,
        satuan: "pinjaman",
        selisih: vsLalu(pb.ini.lunas, pb.lalu.lunas, pb, { satuan: "pinjaman" }),
      },
    ],
    kaki: null,
    daftar: null,
  };
}

const IRAMA: Record<JenisPinjaman, string> = {
  harian: "per hari",
  mingguan: "per minggu",
  tempoan: "sekali bayar",
};

/**
 * Target angsuran pinjaman aktif. Angsuran tiap jenis beda irama (per hari, per minggu,
 * sekali bayar), jadi tak dijumlah lintas jenis: Semua Jenis memakai target HARIAN.
 */
export function kartuAngsuran(data: Portofolio, jenis: JenisPinjaman | null): KartuVM {
  const j = jenis ?? "harian";
  const p = data[j];
  const pb = pembandingUntuk(data.pembanding, j);
  const t = pb.potret;
  const total = p.berjalan.angsuran + p.macet.angsuran;
  return {
    kunci: "angsuran",
    judul: jenis ? "Target Angsuran" : "Target Angsuran Harian",
    ikon: "calendar",
    nilai: total,
    rumus: `Angsuran ${LABEL_JENIS[j].toLowerCase()} berjalan + macet, ${IRAMA[j]}`,
    meta: null,
    selisih: vsPotret(total, t ? t.angsuranBerjalan + t.angsuranMacet : undefined, pb),
    segmen: susunSegmen([
      { label: "Berjalan", nilai: p.berjalan.angsuran },
      { label: "Macet", nilai: p.macet.angsuran },
    ]),
    grid: false,
    rincian: [
      {
        ikon: "trending-up",
        label: "Berjalan",
        nilai: p.berjalan.angsuran,
        selisih: vsPotret(p.berjalan.angsuran, t?.angsuranBerjalan, pb),
      },
      {
        ikon: "circle-alert",
        label: "Macet",
        nilai: p.macet.angsuran,
        ...(p.macet.angsuran > 0 ? { nada: "bahaya" as const } : {}),
        selisih: vsPotret(p.macet.angsuran, t?.angsuranMacet, pb, { naikBaik: false }),
      },
    ],
    kaki: null,
    daftar: null,
  };
}

export function kartuTabungan(p: PortofolioJenis): KartuVM {
  return {
    kunci: "tabungan",
    judul: "Tabungan Nasabah",
    ikon: "piggy-bank",
    nilai: p.berjalan.tabungan + p.macet.tabungan,
    rumus: "Masih dipegang nasabah berjalan + macet",
    meta: "Tanpa pembanding — tabungan tak dipotret harian",
    selisih: null,
    segmen: susunSegmen([
      { label: "Berjalan", nilai: p.berjalan.tabungan },
      { label: "Macet", nilai: p.macet.tabungan },
    ]),
    grid: false,
    rincian: [
      { ikon: "circle-check", label: "Berjalan", nilai: p.berjalan.tabungan },
      { ikon: "circle-alert", label: "Macet", nilai: p.macet.tabungan },
    ],
    kaki: null,
    daftar: null,
  };
}

/** Penyelesaian piutang BULAN INI (pokok terlunasi murni, tabungan keluar, pokok berkurang). */
export function kartuPenyelesaian(p: PortofolioJenis, pb: Pembanding): KartuVM {
  return {
    kunci: "penyelesaian",
    judul: "Penyelesaian Piutang",
    ikon: "check-check",
    nilai: pb.ini.pokokLunas,
    rumus: `Pokok terlunasi murni bulan ini · ${pb.ini.lunas} pinjaman`,
    meta: `Sepanjang masa ${rupiah(p.lunas.pokok)} · ${p.lunas.jumlah} pinjaman lunas`,
    selisih: vsLalu(pb.ini.pokokLunas, pb.lalu.pokokLunas, pb),
    segmen: null,
    grid: false,
    rincian: [
      {
        ikon: "piggy-bank",
        label: "Tabungan keluar",
        nilai: pb.ini.tabunganKeluar,
        selisih: vsLalu(pb.ini.tabunganKeluar, pb.lalu.tabunganKeluar, pb),
      },
      {
        ikon: "trending-down",
        label: "Pokok berkurang (gulung)",
        nilai: pb.ini.pokokBerkurang,
        selisih: vsLalu(pb.ini.pokokBerkurang, pb.lalu.pokokBerkurang, pb),
      },
    ],
    kaki: null,
    daftar: null,
  };
}

/** Piutang yang dihapus bos (pemutihan, K); null bila tak pernah ada. */
export function kartuDiputihkan(p: PortofolioJenis): KartuVM | null {
  if (p.diputihkan.jumlah === 0) return null;
  return {
    kunci: "diputihkan",
    judul: "Diputihkan",
    ikon: "eraser",
    nilai: p.diputihkan.saldo,
    rumus: "Saldo yang dihapus bos, sepanjang masa",
    meta: `${p.diputihkan.jumlah} pinjaman`,
    selisih: null,
    segmen: null,
    grid: false,
    rincian: [],
    kaki: null,
    daftar: null,
  };
}

/** Kartu sorot + kartu-kartu di bawahnya untuk satu saringan jenis. */
export function susunPortofolio(
  data: Portofolio,
  jenis: JenisPinjaman | null,
): { sorot: SorotVM; kartu: KartuVM[]; pembanding: Pembanding } {
  const p = portofolioUntuk(data, jenis);
  const pb = pembandingUntuk(data.pembanding, jenis);
  const kartu: (KartuVM | null)[] = [
    jenis === null ? kartuPerJenis(data) : null,
    kartuNasabah(p, pb),
    kartuAngsuran(data, jenis),
    kartuTabungan(p),
    kartuPenyelesaian(p, pb),
    kartuDiputihkan(p),
  ];
  return {
    sorot: sorotSaldoAkhir(p, pb),
    kartu: kartu.filter((k): k is KartuVM => k !== null),
    pembanding: pb,
  };
}
