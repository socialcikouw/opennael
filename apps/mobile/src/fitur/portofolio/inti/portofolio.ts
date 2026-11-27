import type { Portofolio, PortofolioJenis } from "@opennael/contracts";
import type { JenisPinjaman } from "@opennael/domain";
import { LABEL_JENIS } from "@opennael/format";
import { susunSegmen } from "../../../komponen/statistik/komposisi";
import type { KartuVM, SorotVM } from "../../../komponen/statistik/tipe";

/**
 * PORTOFOLIO pegangan kolektor (rupa aplikasi lama, 27 Nov 2026) — kartu sorot SALDO AKHIR
 * (piutang yang masih di lapangan, bar berjalan vs macet: porsi macet terbaca lebih dulu),
 * lalu kartu rincian Per Jenis (Semua) · Nasabah Aktif · Target Angsuran · Tabungan Nasabah
 * · Penyelesaian Piutang · Diputihkan. Server memberi angka per jenis sekaligus (`GET /lapangan/portofolio`), jadi
 * pil jenis tak memicu permintaan baru. PURE.
 */

const URUTAN_JENIS: readonly JenisPinjaman[] = ["harian", "mingguan", "tempoan"];
const STATUS = ["berjalan", "macet", "diputihkan"] as const;

/** Satu jenis, atau ketiganya dijumlah (`jenis` null = Semua Jenis). */
export function portofolioUntuk(data: Portofolio, jenis: JenisPinjaman | null): PortofolioJenis {
  if (jenis) return data[jenis];
  const semua = URUTAN_JENIS.map((j) => data[j]);
  const jumlah = (status: (typeof STATUS)[number]) => ({
    jumlah: semua.reduce((n, j) => n + j[status].jumlah, 0),
    saldo: semua.reduce((n, j) => n + j[status].saldo, 0),
    angsuran: semua.reduce((n, j) => n + j[status].angsuran, 0),
    tabungan: semua.reduce((n, j) => n + j[status].tabungan, 0),
  });
  return {
    berjalan: jumlah("berjalan"),
    macet: jumlah("macet"),
    diputihkan: jumlah("diputihkan"),
    lunas: {
      jumlah: semua.reduce((n, j) => n + j.lunas.jumlah, 0),
      pokok: semua.reduce((n, j) => n + j.lunas.pokok, 0),
    },
    penyelesaian: {
      pokokBerkurang: semua.reduce((n, j) => n + j.penyelesaian.pokokBerkurang, 0),
      tabunganKeluar: semua.reduce((n, j) => n + j.penyelesaian.tabunganKeluar, 0),
    },
  };
}

/** Piutang aktif (berjalan + macet, aturan-usaha M) dan banyak pinjamannya. */
export function piutangAktif(p: PortofolioJenis): { jumlah: number; saldo: number; macet: number } {
  return {
    jumlah: p.berjalan.jumlah + p.macet.jumlah,
    saldo: p.berjalan.saldo + p.macet.saldo,
    macet: p.macet.jumlah,
  };
}

/** Persen bulat bagian dari keseluruhan; 0 bila keseluruhan nol. */
const persen = (bagian: number, semua: number) =>
  semua > 0 ? Math.round((bagian / semua) * 100) : 0;

export function sorotSaldoAkhir(p: PortofolioJenis): SorotVM {
  const aktif = piutangAktif(p);
  const macet = persen(p.macet.saldo, aktif.saldo);
  return {
    label: "Saldo Akhir",
    ikon: "chart-pie",
    nilai: aktif.saldo,
    lencana: p.macet.saldo > 0 ? `${macet < 1 ? "<1" : macet}% macet` : null,
    rumus: `Piutang yang masih di lapangan · ${aktif.jumlah} pinjaman`,
    selisih: null,
    segmen: susunSegmen([
      { label: "Berjalan", nilai: p.berjalan.saldo },
      { label: "Macet", nilai: p.macet.saldo },
    ]),
    keping: [
      { label: "Saldo berjalan", nilai: p.berjalan.saldo },
      { label: "Saldo macet", nilai: p.macet.saldo },
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
      return {
        ikon:
          j === "harian" ? "calendar-days" : j === "mingguan" ? "calendar-range" : "calendar-clock",
        label: `${LABEL_JENIS[j]} · ${a.jumlah} orang${a.macet > 0 ? ` (${a.macet} macet)` : ""}`,
        nilai: a.saldo,
      };
    }),
    kaki: null,
    daftar: null,
  };
}

export function kartuNasabah(p: PortofolioJenis): KartuVM {
  return {
    kunci: "nasabah",
    judul: "Nasabah Aktif",
    ikon: "users",
    nilai: p.berjalan.jumlah + p.macet.jumlah,
    satuan: "nasabah",
    rumus: "Berjalan + macet",
    meta: null,
    selisih: null,
    segmen: susunSegmen([
      { label: "Berjalan", nilai: p.berjalan.jumlah },
      { label: "Macet", nilai: p.macet.jumlah },
    ]),
    grid: false,
    rincian: [
      { ikon: "circle-check", label: "Berjalan", nilai: p.berjalan.jumlah, satuan: "orang" },
      {
        ikon: "triangle-alert",
        label: "Macet",
        nilai: p.macet.jumlah,
        satuan: "orang",
        ...(p.macet.jumlah > 0 ? { nada: "bahaya" as const } : {}),
      },
      {
        ikon: "badge-check",
        label: "Lunas (sepanjang masa)",
        nilai: p.lunas.jumlah,
        satuan: "pinjaman",
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
  return {
    kunci: "angsuran",
    judul: jenis ? "Target Angsuran" : "Target Angsuran Harian",
    ikon: "calendar",
    nilai: p.berjalan.angsuran + p.macet.angsuran,
    rumus: `Angsuran ${LABEL_JENIS[j].toLowerCase()} berjalan + macet, ${IRAMA[j]}`,
    meta: null,
    selisih: null,
    segmen: susunSegmen([
      { label: "Berjalan", nilai: p.berjalan.angsuran },
      { label: "Macet", nilai: p.macet.angsuran },
    ]),
    grid: false,
    rincian: [
      { ikon: "trending-up", label: "Berjalan", nilai: p.berjalan.angsuran },
      {
        ikon: "circle-alert",
        label: "Macet",
        nilai: p.macet.angsuran,
        ...(p.macet.angsuran > 0 ? { nada: "bahaya" as const } : {}),
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
    meta: null,
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

/**
 * Penyelesaian piutang sepanjang masa (rupa aplikasi lama): pokok yang terlunasi murni
 * (pinjaman berstatus lunas — yang digulung tidak), serta dua jalan lain piutang selesai:
 * tabungan keluar (pelunasan ditutup tabungan, D) dan pokok berkurang karena gulung turun (E).
 */
export function kartuPenyelesaian(p: PortofolioJenis): KartuVM {
  return {
    kunci: "penyelesaian",
    judul: "Penyelesaian Piutang",
    ikon: "check-check",
    nilai: p.lunas.pokok,
    rumus: "Pokok terlunasi murni, sepanjang masa",
    meta: `${p.lunas.jumlah} pinjaman lunas`,
    selisih: null,
    segmen: null,
    grid: false,
    rincian: [
      { ikon: "piggy-bank", label: "Tabungan keluar", nilai: p.penyelesaian.tabunganKeluar },
      {
        ikon: "trending-down",
        label: "Pokok berkurang (gulung)",
        nilai: p.penyelesaian.pokokBerkurang,
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

/** Kartu-kartu di bawah kartu sorot, urut. */
export function susunKartuPortofolio(data: Portofolio, jenis: JenisPinjaman | null): KartuVM[] {
  const p = portofolioUntuk(data, jenis);
  const kartu: (KartuVM | null)[] = [
    jenis === null ? kartuPerJenis(data) : null,
    kartuNasabah(p),
    kartuAngsuran(data, jenis),
    kartuTabungan(p),
    kartuPenyelesaian(p),
    kartuDiputihkan(p),
  ];
  return kartu.filter((k): k is KartuVM => k !== null);
}
