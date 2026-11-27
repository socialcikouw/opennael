import { geserTanggal, type JenisPinjaman } from "@opennael/domain";

/**
 * SIMULASI LAPANGAN — bahan `data-bulan-lalu.ts`. PURE (tanpa I/O): dari daftar hari masuk
 * kerja kolektor dan rencana pinjaman, susun akad + setoran harian yang mengikuti aturan
 * usaha (harian 25× 125% admin 5% tabungan 5%; mingguan 8× 120% admin 10%; tempoan 125%
 * sekali bayar di hari masuk kerja ke-6). Acak tapi berulang (benih tetap).
 */

/** PRNG mulberry32 — hasil sama untuk benih sama. */
export function buatAcak(benih: number) {
  let a = benih >>> 0;
  const acak = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const bulat = (min: number, maks: number) => min + Math.floor(acak() * (maks - min + 1));
  const pilih = <T>(xs: readonly T[]): T => xs[bulat(0, xs.length - 1)] as T;
  return { acak, bulat, pilih };
}
export type Acak = ReturnType<typeof buatAcak>;

export interface Setoran {
  tanggal: string;
  jenis: "angsuran" | "pelunasan";
  setoranMurni: number;
  setoranPelunasan: number;
  tabunganKeluar: number;
  saldoSesudah: number;
}

export interface HasilPinjaman {
  jenis: JenisPinjaman;
  tenor: number;
  akad: string;
  pokok: number;
  potonganAdmin: number;
  tabunganMasuk: number;
  pencairan: number;
  totalKembali: number;
  angsuran: number;
  status: "berjalan" | "lunas" | "macet";
  saldo: number;
  tanggalSelesai: string | null;
  tanggalMacet: string | null;
  setoran: Setoran[];
  /** Tak habis sendiri sebelum batas, jadi dilunasi sekaligus di hari kerja terakhir. */
  dipaksa: boolean;
}

export interface Rencana {
  jenis: JenisPinjaman;
  akad: string;
  /** Harus lunas paling lambat tanggal ini (pinjaman berikutnya mulai sesudahnya). */
  batas: string;
  /** Macet: berhenti membayar sesudah tanggal ini, macet pada `tanggalMacet`. */
  macet?: { berhentiSesudah: string; tanggalMacet: string };
}

const POKOK: Record<JenisPinjaman, readonly number[]> = {
  harian: [500_000, 700_000, 1_000_000, 1_000_000, 1_000_000, 1_200_000, 1_500_000, 2_000_000],
  mingguan: [1_000_000, 1_500_000, 2_000_000, 2_000_000, 3_000_000],
  tempoan: [300_000, 500_000, 500_000, 1_000_000, 2_000_000],
};

/** Hari masuk kerja kolektor, terurut, dengan "kemungkinan bayar" per hari (hujan, pasar). */
export interface Kalender {
  masuk: readonly string[];
  peluangBayar: ReadonlyMap<string, number>;
}

function hariMasukSesudah(k: Kalender, tanggal: string, sampai: string): string[] {
  return k.masuk.filter((t) => t > tanggal && t <= sampai);
}

/** Satu pinjaman dari akad sampai lunas / macet / batas, mengikuti rencana. */
export function simulasikan(r: Rencana, k: Kalender, acak: Acak): HasilPinjaman {
  const pokok = acak.pilih(POKOK[r.jenis]);
  const tarif =
    r.jenis === "harian"
      ? { tenor: 25, kembali: 125, admin: 5, tabungan: 5 }
      : r.jenis === "mingguan"
        ? { tenor: 8, kembali: 120, admin: 10, tabungan: 0 }
        : { tenor: 6, kembali: 125, admin: 0, tabungan: 0 };
  const total = (pokok * tarif.kembali) / 100;
  const angsuran = r.jenis === "tempoan" ? total : total / tarif.tenor;
  const tabungan = (pokok * tarif.tabungan) / 100;
  const admin = (pokok * tarif.admin) / 100;
  const hasil: HasilPinjaman = {
    jenis: r.jenis,
    tenor: tarif.tenor,
    akad: r.akad,
    pokok,
    potonganAdmin: admin,
    tabunganMasuk: tabungan,
    pencairan: pokok - admin - tabungan,
    totalKembali: total,
    angsuran,
    status: "berjalan",
    saldo: total,
    tanggalSelesai: null,
    tanggalMacet: null,
    setoran: [],
    dipaksa: false,
  };
  const hari = hariMasukSesudah(k, r.akad, r.batas);
  const terakhir = hari[hari.length - 1];
  let sisa = total;

  const bayar = (tanggal: string, murniDiminta: number) => {
    // Lunas bila sisanya tertutup tabungan (aturan lunas bertabungan).
    if (sisa - murniDiminta <= tabungan) {
      const pelunasan = Math.min(tabungan, sisa);
      hasil.setoran.push({
        tanggal,
        jenis: "pelunasan",
        setoranMurni: sisa - pelunasan,
        setoranPelunasan: pelunasan,
        tabunganKeluar: tabungan,
        saldoSesudah: 0,
      });
      sisa = 0;
      hasil.status = "lunas";
      hasil.tanggalSelesai = tanggal;
      return;
    }
    sisa -= murniDiminta;
    hasil.setoran.push({
      tanggal,
      jenis: "angsuran",
      setoranMurni: murniDiminta,
      setoranPelunasan: 0,
      tabunganKeluar: 0,
      saldoSesudah: sisa,
    });
  };

  if (r.jenis === "tempoan") {
    // Jatuh tempo = hari masuk kerja ke-6 sesudah akad; kebanyakan dibayar hari itu.
    const jatuh = hari[5];
    const mundur = acak.acak() < 0.65 ? 0 : acak.acak() < 0.7 ? 1 : 2;
    const tanggal = hari[Math.min(5 + mundur, hari.length - 1)] ?? terakhir;
    if (tanggal && jatuh) bayar(tanggal, sisa);
    else if (terakhir) bayar(terakhir, sisa);
  } else if (r.jenis === "mingguan") {
    let tunggakan = 0;
    for (let ke = 1; sisa > 0; ke++) {
      const tagih = geserTanggal(r.akad, 7 * ke);
      if (tagih > r.batas) break;
      const tanggal = k.masuk.find((t) => t >= tagih && t <= r.batas);
      if (!tanggal) break;
      if (acak.acak() < 0.85) {
        const kali = tunggakan > 0 && acak.acak() < 0.6 ? 2 : 1;
        tunggakan = Math.max(0, tunggakan - (kali - 1));
        bayar(tanggal, Math.min(sisa, angsuran * kali));
      } else tunggakan++;
    }
  } else {
    for (const t of hari) {
      if (sisa <= 0) break;
      if (r.macet && t > r.macet.berhentiSesudah) break;
      if (acak.acak() >= (k.peluangBayar.get(t) ?? 0.9)) continue;
      const kali = acak.acak() < 0.07 ? 2 : 1;
      bayar(t, Math.min(sisa, angsuran * kali));
    }
  }

  if (r.macet && sisa > 0) {
    hasil.status = "macet";
    hasil.tanggalMacet = r.macet.tanggalMacet;
  } else if (sisa > 0 && terakhir) {
    // Belum habis sebelum pinjaman berikutnya: dilunasi di hari kerja terakhir.
    hasil.dipaksa = true;
    const akhir = hasil.setoran[hasil.setoran.length - 1];
    if (akhir?.tanggal === terakhir) {
      // Satu setoran per hari: gabungkan dengan setoran hari itu.
      hasil.setoran.pop();
      sisa += akhir.setoranMurni;
    }
    bayar(terakhir, Math.max(0, sisa - tabungan));
  }
  hasil.saldo = sisa;
  return hasil;
}

/** Saldo pinjaman pada akhir `tanggal` (sebelum akad = null). */
export function saldoPada(p: HasilPinjaman, tanggal: string): number | null {
  if (p.akad > tanggal) return null;
  let saldo = p.totalKembali;
  for (const s of p.setoran) if (s.tanggal <= tanggal) saldo = s.saldoSesudah;
  return saldo;
}

/** Status pada akhir `tanggal`: null = belum lahir atau sudah lunas. */
export function statusPada(p: HasilPinjaman, tanggal: string): "berjalan" | "macet" | null {
  if (p.akad > tanggal) return null;
  if (p.tanggalSelesai && p.tanggalSelesai <= tanggal) return null;
  if (p.tanggalMacet && p.tanggalMacet <= tanggal) return "macet";
  return "berjalan";
}
