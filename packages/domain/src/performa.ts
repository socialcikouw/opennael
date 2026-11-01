import { geserTanggal, selisihHari } from "./kalender";

/**
 * PERFORMA PENAGIHAN — docs/aturan-usaha.md bagian N. Harian (N1–N2): patokan =
 * angsuran berjalan akhir kemarin − angsuran yang mati hari itu; persentase =
 * setoran murni ÷ patokan × 100. Mingguan & tempoan (N3): `patokanJatuhTagih`
 * di bawah. Semua jenis (N4): `gabungPerforma`.
 */
export interface HasilPerforma {
  /** null = belum ada potret kemarin. */
  patokan: number | null;
  /** null = belum ada potret kemarin, atau patokan ≤ 0. */
  persentase: number | null;
}

export function hitungPerforma(
  setoranMurni: number,
  angsuranKemarin: number | null,
  angsuranMati: number,
): HasilPerforma {
  if (angsuranKemarin === null) return { patokan: null, persentase: null };
  const patokan = angsuranKemarin - angsuranMati;
  return { patokan, persentase: patokan > 0 ? (setoranMurni / patokan) * 100 : null };
}

// ---- N3. Mingguan & tempoan ------------------------------------------------------------

export type StatusPinjaman = "berjalan" | "macet" | "lunas" | "digulung" | "batal" | "diputihkan";

/** Satu perpindahan status (`riwayat_status_pinjaman`), diurutkan menurut kejadian. */
export interface PerpindahanStatus {
  /** Hari pembukuan perpindahan. */
  tanggal: string;
  sesudah: StatusPinjaman;
}

/**
 * Status pada akhir `hari`: perpindahan terakhir dengan `tanggal ≤ hari`; null
 * = pinjaman belum lahir. `riwayat` harus berurutan menurut kejadian.
 */
export function statusPada(
  riwayat: readonly PerpindahanStatus[],
  hari: string,
): StatusPinjaman | null {
  let status: StatusPinjaman | null = null;
  for (const r of riwayat) {
    if (r.tanggal <= hari) status = r.sesudah;
  }
  return status;
}

/** Satu pinjaman mingguan/tempoan beserta riwayat statusnya — bahan patokan N3. */
export interface BahanPatokan {
  jenis: "mingguan" | "tempoan";
  angsuran: number;
  tanggalAkad: string;
  tenor: number;
  jatuhTempo: string | null;
  status: StatusPinjaman;
  tanggalSelesai: string | null;
  riwayat: readonly PerpindahanStatus[];
}

/**
 * Hari tagih pinjaman ini: mingguan akad + 7k (1 ≤ k ≤ tenor, B3), tempoan
 * pada jatuh tempo (akad + tenor bila tak tersimpan).
 */
export function jatuhTagihPada(b: BahanPatokan, hari: string): boolean {
  if (b.jenis === "tempoan") return hari === (b.jatuhTempo ?? geserTanggal(b.tanggalAkad, b.tenor));
  const selisih = selisihHari(b.tanggalAkad, hari);
  return selisih > 0 && selisih % 7 === 0 && selisih / 7 <= b.tenor;
}

/**
 * PATOKAN N3 untuk hari D: Σ angsuran yang (a) jatuh tagih pada D, (b) berjalan
 * pada akhir D−1, dan (c) tidak berakhir pada D karena digulung atau diputihkan.
 * Lunas pada D tidak dikurangi.
 */
export function patokanJatuhTagih(daftar: readonly BahanPatokan[], hari: string): number {
  const kemarin = geserTanggal(hari, -1);
  let patokan = 0;
  for (const b of daftar) {
    if (!jatuhTagihPada(b, hari)) continue;
    if (statusPada(b.riwayat, kemarin) !== "berjalan") continue;
    const berakhirTanpaBayar =
      b.tanggalSelesai === hari && (b.status === "digulung" || b.status === "diputihkan");
    if (berakhirTanpaBayar) continue;
    patokan += b.angsuran;
  }
  return patokan;
}

/** Persentase N3/N4: kosong bila patokan ≤ 0 (bukan nol). */
export function persentasePerforma(setoranMurni: number, patokan: number): number | null {
  return patokan > 0 ? (setoranMurni / patokan) * 100 : null;
}

// ---- N4. Semua jenis -------------------------------------------------------------------

export interface TitikPerforma {
  setoranMurni: number;
  /** null = belum ada potret (hanya harian). */
  patokan: number | null;
}

/** Jumlah ketiga jenis pada satu hari; patokan yang kosong dihitung nol. */
export function gabungPerforma(titik: readonly TitikPerforma[]): {
  setoranMurni: number;
  patokan: number;
  persentase: number | null;
} {
  const setoranMurni = titik.reduce((n, t) => n + t.setoranMurni, 0);
  const patokan = titik.reduce((n, t) => n + (t.patokan ?? 0), 0);
  return { setoranMurni, patokan, persentase: persentasePerforma(setoranMurni, patokan) };
}
