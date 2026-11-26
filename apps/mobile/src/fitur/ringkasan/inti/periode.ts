import { geserTanggal, hariPekanDari } from "@opennael/domain";
import { namaBulan, tanggal, tanggalPendek } from "@opennael/format";

/**
 * PERIODE RINGKASAN — pil di bawah judul: Hari Ini · Pekan Ini · Bulan Ini · lima bulan
 * lalu. Tiap periode membawa rentang tanggal kantor dan PEMBANDING SEPADAN (panjang yang
 * sama), supaya "naik/turun" tidak menipu: Bulan Ini (1–27 Nov) dibanding 1–27 Okt, bukan
 * Oktober penuh; bulan yang sudah lewat dibanding bulan sebelumnya penuh. PURE.
 */

export interface Rentang {
  mulai: string;
  selesai: string;
}

export interface Periode {
  /** Kunci pil: "hari-ini" · "pekan-ini" · "bulan-ini" · "2026-10" (bulan lalu). */
  kunci: string;
  /** Teks pil. */
  pil: string;
  /** Teks kecil di atas judul layar. */
  judul: string;
  rentang: Rentang;
  /** Rentang sepadan sebelumnya + labelnya ("Oktober 1–27"); null = tak dibandingkan. */
  pembanding: { rentang: Rentang; label: string } | null;
  /** Hari ini saja: Mutasi Kas & daftar per nasabah berlaku. */
  hariIni: boolean;
}

/** `2026-11` → banyak hari bulan itu. */
function hariDalamBulan(bulan: string): number {
  const [th, bl] = bulan.split("-").map(Number);
  return new Date(Date.UTC(th ?? 1970, bl ?? 1, 0)).getUTCDate();
}

/** `2026-11` → `2026-10`. */
function bulanSebelum(bulan: string): string {
  const [th, bl] = bulan.split("-").map(Number);
  const d = new Date(Date.UTC(th ?? 1970, (bl ?? 1) - 2, 1));
  return d.toISOString().slice(0, 7);
}

const duaDigit = (n: number) => String(n).padStart(2, "0");

/** Bulan penuh: 1 s/d hari terakhir. */
function bulanPenuh(bulan: string): Rentang {
  return { mulai: `${bulan}-01`, selesai: `${bulan}-${duaDigit(hariDalamBulan(bulan))}` };
}

export function daftarPeriode(hariIni: string, bulanLalu = 5): Periode[] {
  const bulanIni = hariIni.slice(0, 7);
  const tanggalKe = Number(hariIni.slice(8, 10));

  // Pekan Senin–Sabtu kantor: Senin pekan ini s/d hari ini (Minggu = ujung pekan lalu).
  const senin = geserTanggal(hariIni, -((hariPekanDari(hariIni) + 6) % 7));
  const seninLalu = geserTanggal(senin, -7);
  const pekanIni: Periode = {
    kunci: "pekan-ini",
    pil: "Pekan Ini",
    judul:
      senin === hariIni
        ? `Pekan ini · ${tanggal(hariIni, "tanpa")}`
        : `Pekan ini · ${tanggalPendek(senin)} – ${tanggal(hariIni, "tanpa")}`,
    rentang: { mulai: senin, selesai: hariIni },
    pembanding: {
      rentang: { mulai: seninLalu, selesai: geserTanggal(hariIni, -7) },
      label: "pekan lalu",
    },
    hariIni: false,
  };

  const lalu = bulanSebelum(bulanIni);
  const ujungLalu = Math.min(tanggalKe, hariDalamBulan(lalu));
  const daftar: Periode[] = [
    {
      kunci: "hari-ini",
      pil: "Hari Ini",
      judul: tanggal(hariIni, "panjang"),
      rentang: { mulai: hariIni, selesai: hariIni },
      pembanding: null,
      hariIni: true,
    },
    pekanIni,
    {
      kunci: "bulan-ini",
      pil: "Bulan Ini",
      judul: tanggalKe === 1 ? namaBulan(bulanIni) : `${namaBulan(bulanIni)} · s/d ${tanggalKe}`,
      rentang: { mulai: `${bulanIni}-01`, selesai: hariIni },
      pembanding: {
        rentang: { mulai: `${lalu}-01`, selesai: `${lalu}-${duaDigit(ujungLalu)}` },
        label: `${namaBulan(lalu).split(" ")[0]} 1–${ujungLalu}`,
      },
      hariIni: false,
    },
  ];

  let bulan = bulanIni;
  for (let i = 0; i < bulanLalu; i++) {
    bulan = bulanSebelum(bulan);
    const sebelum = bulanSebelum(bulan);
    daftar.push({
      kunci: bulan,
      pil: namaBulan(bulan),
      judul: namaBulan(bulan),
      rentang: bulanPenuh(bulan),
      pembanding: { rentang: bulanPenuh(sebelum), label: namaBulan(sebelum).split(" ")[0] ?? "" },
      hariIni: false,
    });
  }
  return daftar;
}
