import type { PratinjauGaji } from "@opennael/contracts";
import { geserTanggal } from "@opennael/domain";
import { tanggal, tanggalPendek } from "@opennael/format";
import type { RincianVM, SorotVM } from "../../../komponen/statistik/tipe";

/**
 * GAJI KOLEKTOR di HP (Mode Rekap › Menu › Gaji, 28 Nov 2026; aturan-usaha J). Tiga bagian:
 *   1. GAJI BERJALAN — yang belum dibayar: sejak sehari sesudah periode slip berlaku terakhir
 *      (belum pernah dibayar → awal bulan ini) sampai hari ini, dihitung server
 *      (`GET /kas/gaji/pratinjau`, tarif sungguhan per hari, J2) — PERKIRAAN, karena hari
 *      ini belum selesai dan tekor baru diketahui saat kasir menerima setoran;
 *   2. rincian per hari periode itu (storting × tarif, tekor);
 *   3. riwayat slip yang sudah dibayar bos (yang dibatalkan tetap tampil, dicoret).
 * PURE.
 */

/** Bentuk slip yang dibaca layar (dari `GET /kas/gaji`). */
export interface Slip {
  id: string;
  periodeMulai: string;
  periodeSelesai: string;
  gajiKotor: number;
  potonganTekor: number;
  gajiBersih: number;
  dariAkun: string;
  tanggalBayar: string;
  keterangan: string | null;
  dibatalkanAt: string | null;
  alasanBatal: string | null;
}

/** Awal periode gaji yang belum dibayar. */
export function mulaiGajiBerjalan(slip: readonly Slip[], hariIni: string): string {
  const akhir = slip
    .filter((s) => s.dibatalkanAt === null)
    .reduce<string | null>(
      (m, s) => (m === null || s.periodeSelesai > m ? s.periodeSelesai : m),
      null,
    );
  const mulai = akhir ? geserTanggal(akhir, 1) : `${hariIni.slice(0, 7)}-01`;
  // Slip hanya untuk periode yang sudah berakhir (J4), jadi mulai tak pernah melewati hari ini.
  return mulai > hariIni ? hariIni : mulai;
}

/** "5% storting − tekor" bila satu tarif sepanjang periode; selain itu rumus umumnya. */
export function rumusGaji(hari: readonly { tarifBp: number }[]): string {
  const tarif = new Set(hari.map((h) => h.tarifBp));
  if (tarif.size !== 1) return "Tarif × storting − tekor";
  const bp = [...tarif][0] ?? 0;
  return `${(bp / 100).toLocaleString("id-ID")}% storting − tekor`;
}

/** Kartu hitam: gaji bersih yang belum dibayar, sejak `mulai` sampai hari ini. */
export function sorotGajiBerjalan(g: PratinjauGaji, mulai: string, hariIni: string): SorotVM {
  const rentang =
    mulai === hariIni ? "Hari ini" : `${tanggalPendek(mulai)} – ${tanggal(hariIni, "tanpa")}`;
  return {
    label: "Gaji Belum Dibayar",
    ikon: "hand-coins",
    nilai: g.gajiBersih,
    lencana: g.gajiBersih < 0 ? "Minus" : "Perkiraan",
    rumus: `${rentang} · ${rumusGaji(g.hari)}`,
    selisih: null,
    segmen: null,
    keping: [
      { label: "Gaji kotor", nilai: g.gajiKotor },
      { label: "Tekor", nilai: g.potonganTekor },
    ],
    kepingBawah: null,
  };
}

/**
 * Satu baris per hari yang punya storting atau tekor, terbaru di atas. Gaji hari itu =
 * storting × tarif ÷ 10.000 (dibulatkan untuk tampilan; server membulatkan sekali per
 * periode, J1 — jadi jumlah baris bisa selisih rupiah dari gaji kotor).
 */
export function barisHarian(g: PratinjauGaji): RincianVM[] {
  return [...g.hari]
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .flatMap((h): RincianVM[] => {
      const baris: RincianVM[] = [];
      if (h.storting !== 0) {
        baris.push({
          ikon: "banknote-arrow-down",
          label: `${tanggalPendek(h.tanggal)} · ${(h.tarifBp / 100).toLocaleString("id-ID")}% dari storting`,
          nilai: Math.round((h.storting * h.tarifBp) / 10_000),
          ...(h.storting < 0 ? { nada: "bahaya" as const } : {}),
        });
      }
      if (h.tekor > 0) {
        baris.push({
          ikon: "triangle-alert",
          label: `${tanggalPendek(h.tanggal)} · tekor`,
          nilai: -h.tekor,
          nada: "bahaya",
        });
      }
      return baris;
    });
}

export interface RingkasSlip {
  /** Σ gaji bersih slip berlaku tahun `tahun`. */
  dibayarTahunIni: number;
  /** Banyaknya slip berlaku tahun itu. */
  jumlahTahunIni: number;
  /** Semua slip, terbaru di atas (yang batal ikut, ditandai layar). */
  urut: Slip[];
}

export function ringkasSlip(slip: readonly Slip[], tahun: string): RingkasSlip {
  const berlaku = slip.filter((s) => s.dibatalkanAt === null && s.tanggalBayar.startsWith(tahun));
  return {
    dibayarTahunIni: berlaku.reduce((n, s) => n + s.gajiBersih, 0),
    jumlahTahunIni: berlaku.length,
    urut: [...slip].sort(
      (a, b) =>
        b.periodeMulai.localeCompare(a.periodeMulai) ||
        b.tanggalBayar.localeCompare(a.tanggalBayar),
    ),
  };
}

/** "1–15 Nov 2026" / "28 Okt – 3 Nov 2026" / "30 Des 2025 – 5 Jan 2026". */
export function teksPeriode(mulai: string, selesai: string): string {
  if (mulai.slice(0, 7) === selesai.slice(0, 7)) {
    return `${Number(mulai.slice(8, 10))}–${tanggal(selesai, "tanpa")}`;
  }
  if (mulai.slice(0, 4) === selesai.slice(0, 4)) {
    return `${tanggalPendek(mulai)} – ${tanggal(selesai, "tanpa")}`;
  }
  return `${tanggal(mulai, "tanpa")} – ${tanggal(selesai, "tanpa")}`;
}
