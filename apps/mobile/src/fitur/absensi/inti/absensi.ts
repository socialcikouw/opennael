import type { KalenderBulan, RiwayatHari } from "@opennael/contracts";
import { geserTanggal, hariPekanDari } from "@opennael/domain";
import { susunSegmen } from "../../../komponen/statistik/komposisi";
import type { SorotVM } from "../../../komponen/statistik/tipe";
import type { BulanPerforma } from "../../../lib/bulan";

/**
 * ABSENSI kolektor (Mode Rekap › Menu › Absensi, 28 Nov 2026) — satu bulan dari riwayat hari
 * (`GET /hari-kolektor/riwayat`) dan kalender kantor (`GET /lapangan/kalender`):
 *   - kalender sebulan Senin–Minggu, tiap hari satu keadaan;
 *   - kehadiran = hari masuk kerja dari hari kerja kantor yang sudah lewat (hari ini ikut
 *     bila sudah absen);
 *   - daftar hari tercatat & hari kerja yang terlewat tanpa absen, terbaru dulu.
 * PURE.
 */

export type KeadaanSel =
  | "masuk"
  | "tidak-kerja"
  /** Hari kerja kantor yang sudah lewat tanpa absen sama sekali. */
  | "tak-absen"
  /** Hari ini, hari kerja, belum absen. */
  | "belum"
  | "libur"
  /** Bukan hari kerja pola pekan (mis. Minggu). */
  | "bukan-kerja"
  | "mendatang";

export interface SelVM {
  tanggal: string;
  angka: number;
  keadaan: KeadaanSel;
  hariIni: boolean;
}

/** Satu pekan Senin–Minggu; null = sel kosong di luar bulan. */
export type PekanVM = (SelVM | null)[];

export function keadaanTanggal(
  tanggal: string,
  hariIni: string,
  kalender: KalenderBulan,
  catatan: RiwayatHari | undefined,
): KeadaanSel {
  if (catatan) return catatan.absensi === "masuk_kerja" ? "masuk" : "tidak-kerja";
  if (kalender.liburKantor.some((l) => l.tanggal === tanggal)) return "libur";
  const kerja = kalender.hariTagih.includes(tanggal);
  if (tanggal > hariIni) return kerja ? "mendatang" : "bukan-kerja";
  if (!kerja) return "bukan-kerja";
  return tanggal === hariIni ? "belum" : "tak-absen";
}

/** Kalender sebulan per pekan (Senin dulu). */
export function susunKalender(
  bulan: BulanPerforma,
  hariIni: string,
  kalender: KalenderBulan,
  riwayat: readonly RiwayatHari[],
): PekanVM[] {
  const per = new Map(riwayat.map((h) => [h.tanggal, h]));
  const awal = `${bulan.kunci}-01`;
  const pekan: PekanVM[] = [];
  let baris: PekanVM = Array((hariPekanDari(awal) + 6) % 7).fill(null);
  for (let t = awal; t.startsWith(bulan.kunci); t = geserTanggal(t, 1)) {
    baris.push({
      tanggal: t,
      angka: Number(t.slice(8, 10)),
      keadaan: keadaanTanggal(t, hariIni, kalender, per.get(t)),
      hariIni: t === hariIni,
    });
    if (baris.length === 7) {
      pekan.push(baris);
      baris = [];
    }
  }
  if (baris.length > 0) pekan.push([...baris, ...Array(7 - baris.length).fill(null)]);
  return pekan;
}

export interface RingkasAbsensi {
  masuk: number;
  tidakKerja: number;
  takAbsen: number;
  /** Hari kerja kantor yang dinilai (sudah lewat; hari ini bila sudah absen). */
  hariKerja: number;
  /** Persen masuk dari hari kerja; null bila belum ada hari kerja. */
  persen: number | null;
}

export function ringkasAbsensi(pekan: readonly PekanVM[]): RingkasAbsensi {
  const r = { masuk: 0, tidakKerja: 0, takAbsen: 0 };
  for (const p of pekan) {
    for (const s of p) {
      if (s?.keadaan === "masuk") r.masuk++;
      else if (s?.keadaan === "tidak-kerja") r.tidakKerja++;
      else if (s?.keadaan === "tak-absen") r.takAbsen++;
    }
  }
  const hariKerja = r.masuk + r.tidakKerja + r.takAbsen;
  return {
    ...r,
    hariKerja,
    persen: hariKerja > 0 ? Math.round((r.masuk / hariKerja) * 100) : null,
  };
}

export function sorotKehadiran(r: RingkasAbsensi, bulanIni: boolean): SorotVM {
  return {
    label: "Kehadiran",
    ikon: "user-round-check",
    nilai: r.masuk,
    satuan: "hari",
    lencana: r.persen === null ? null : `${r.persen}% hadir`,
    rumus:
      r.hariKerja === 0
        ? "Belum ada hari kerja kantor yang lewat"
        : `masuk dari ${r.hariKerja} hari kerja kantor${bulanIni ? " s/d hari ini" : ""}`,
    selisih: null,
    segmen: susunSegmen([
      { label: "Masuk", nilai: r.masuk },
      { label: "Tidak kerja", nilai: r.tidakKerja },
      { label: "Tak absen", nilai: r.takAbsen },
    ]),
    keping: [
      { label: "Tidak kerja", nilai: r.tidakKerja, satuan: "hari" },
      { label: "Tak absen", nilai: r.takAbsen, satuan: "hari" },
    ],
    kepingBawah: null,
  };
}

export interface BarisAbsenVM {
  tanggal: string;
  keadaan: "masuk" | "tidak-kerja" | "tak-absen";
  /** Waktu absen (ISO) — layar memformat jam kantor; null bila tak absen. */
  absenAt: string | null;
  alasan: string | null;
}

/** Hari tercatat & hari kerja terlewat tanpa absen, terbaru dulu. */
export function daftarAbsen(
  pekan: readonly PekanVM[],
  riwayat: readonly RiwayatHari[],
): BarisAbsenVM[] {
  const per = new Map(riwayat.map((h) => [h.tanggal, h]));
  const baris: BarisAbsenVM[] = [];
  for (const p of pekan) {
    for (const s of p) {
      if (!s) continue;
      if (s.keadaan !== "masuk" && s.keadaan !== "tidak-kerja" && s.keadaan !== "tak-absen") {
        continue;
      }
      const h = per.get(s.tanggal);
      baris.push({
        tanggal: s.tanggal,
        keadaan: s.keadaan,
        absenAt: h?.absenAt ?? null,
        alasan: h?.alasanTidakKerja ?? null,
      });
    }
  }
  return baris.reverse();
}
