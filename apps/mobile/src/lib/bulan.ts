import { namaBulan } from "@opennael/format";

/**
 * PIL BULAN layar Rekap (Performa, Riwayat Kas) — Bulan Ini lalu lima bulan lalu (seperti aplikasi lama). Bulan
 * berjalan dibaca sampai hari ini; bulan lalu penuh. PURE.
 */
export interface BulanPerforma {
  /** "2026-11". */
  kunci: string;
  /** "Bulan Ini" / "Oktober 2026". */
  pil: string;
  /** "November 2026 · s/d 27" / "Oktober 2026". */
  judul: string;
  mulai: string;
  selesai: string;
  bulanIni: boolean;
}

function bulanSebelum(bulan: string): string {
  const [th, bl] = bulan.split("-").map(Number);
  return new Date(Date.UTC(th ?? 1970, (bl ?? 1) - 2, 1)).toISOString().slice(0, 7);
}

function akhirBulan(bulan: string): string {
  const [th, bl] = bulan.split("-").map(Number);
  const hari = new Date(Date.UTC(th ?? 1970, bl ?? 1, 0)).getUTCDate();
  return `${bulan}-${String(hari).padStart(2, "0")}`;
}

export function daftarBulan(hariIni: string, lalu = 5): BulanPerforma[] {
  const ini = hariIni.slice(0, 7);
  const tgl = Number(hariIni.slice(8, 10));
  const daftar: BulanPerforma[] = [
    {
      kunci: ini,
      pil: "Bulan Ini",
      judul: tgl === 1 ? namaBulan(ini) : `${namaBulan(ini)} · s/d ${tgl}`,
      mulai: `${ini}-01`,
      selesai: hariIni,
      bulanIni: true,
    },
  ];
  let b = ini;
  for (let i = 0; i < lalu; i++) {
    b = bulanSebelum(b);
    daftar.push({
      kunci: b,
      pil: namaBulan(b),
      judul: namaBulan(b),
      mulai: `${b}-01`,
      selesai: akhirBulan(b),
      bulanIni: false,
    });
  }
  return daftar;
}
