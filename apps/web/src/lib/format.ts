import type { JenisPinjaman, ZonaWaktu } from "@opennael/domain";

/**
 * FORMAT TAMPILAN — rupiah, tanggal kantor (`YYYY-MM-DD`), dan jam menurut
 * zona kantor. Tanggal pembukuan adalah teks; tidak pernah diubah menjadi
 * `Date` lokal browser supaya tidak bergeser zona.
 */

const rupiahFormat = new Intl.NumberFormat("id-ID");

/** `1234567` → `Rp 1.234.567`; negatif → `−Rp 1.234.567`. */
export function rupiah(n: number): string {
  return `${n < 0 ? "−" : ""}Rp ${rupiahFormat.format(Math.abs(n))}`;
}

/** Angka polos berpemisah ribuan. */
export function angka(n: number): string {
  return rupiahFormat.format(n);
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** `2026-10-23` → `Jum, 23 Okt 2026` (tanpa hari: `23 Okt 2026`). */
export function tanggal(t: string, denganHari = true): string {
  const [th, bl, tg] = t.split("-").map(Number);
  if (!th || !bl || !tg) return t;
  const hari = HARI[new Date(Date.UTC(th, bl - 1, tg)).getUTCDay()];
  const isi = `${tg} ${BULAN[bl - 1]} ${th}`;
  return denganHari ? `${hari}, ${isi}` : isi;
}

/** `2026-10-23` → `23 Okt` — sumbu grafik. */
export function tanggalPendek(t: string): string {
  const [, bl, tg] = t.split("-").map(Number);
  return bl && tg ? `${tg} ${BULAN[bl - 1]}` : t;
}

const ZONA_IANA: Record<ZonaWaktu, string> = {
  WIB: "Asia/Jakarta",
  WITA: "Asia/Makassar",
  WIT: "Asia/Jayapura",
};

/** Waktu ISO → `14.05` menurut jam dinding kantor. */
export function jam(iso: string, zona: ZonaWaktu): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA_IANA[zona],
  }).format(new Date(iso));
}

/** Waktu ISO → `23 Okt 2026 14.05` menurut jam dinding kantor. */
export function waktu(iso: string, zona: ZonaWaktu): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA_IANA[zona],
  }).format(new Date(iso));
}

/** Persentase satu desimal: `90` → `90%`, `87.25` → `87,3%`. */
export function persen(n: number): string {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n)}%`;
}

// ---- pinjaman -------------------------------------------------------------------

export const LABEL_JENIS: Record<JenisPinjaman, string> = {
  harian: "Harian",
  mingguan: "Mingguan",
  tempoan: "Tempoan",
};

/** Satuan tenor per jenis (A2): harian & mingguan = kali bayar, tempoan = hari. */
export function namaTenor(jenis: JenisPinjaman, tenor: number): string {
  return jenis === "tempoan" ? `${tenor} hari` : `${tenor}×`;
}

export type StatusPinjaman = "berjalan" | "macet" | "lunas" | "digulung" | "batal" | "diputihkan";

export const LABEL_STATUS: Record<
  StatusPinjaman,
  { label: string; nada: "success" | "warning" | "secondary" | "destructive" }
> = {
  berjalan: { label: "Berjalan", nada: "success" },
  macet: { label: "Macet", nada: "warning" },
  lunas: { label: "Lunas", nada: "secondary" },
  digulung: { label: "Digulung", nada: "secondary" },
  batal: { label: "Batal", nada: "destructive" },
  diputihkan: { label: "Diputihkan", nada: "destructive" },
};

export const LABEL_PERISTIWA = {
  angsuran: "Angsuran",
  pelunasan: "Pelunasan",
  gulung: "Gulung",
  libur: "Libur",
} as const;
