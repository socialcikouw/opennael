import type { ZonaWaktu } from "@opennael/domain";

/**
 * FORMAT TANGGAL — tanggal kantor adalah teks `YYYY-MM-DD`; tidak pernah
 * diubah menjadi `Date` lokal perangkat supaya tidak bergeser zona. Hanya
 * waktu kejadian (ISO) yang diformat menurut zona kantor.
 */

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const HARI_PENDEK = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const HARI_PANJANG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Bentuk nama hari: tanpa hari, `Jum`, atau `Jumat`. */
export type NamaHari = "tanpa" | "pendek" | "panjang";

/**
 * `2026-10-23` → `Jum, 23 Okt 2026` (`pendek`, bawaan), `Jumat, 23 Okt 2026`
 * (`panjang`), `23 Okt 2026` (`tanpa`). Teks yang bukan tanggal dikembalikan apa adanya.
 */
export function tanggal(t: string, hari: NamaHari = "pendek"): string {
  const [th, bl, tg] = t.split("-").map(Number);
  if (!th || !bl || !tg) return t;
  const isi = `${tg} ${BULAN[bl - 1]} ${th}`;
  if (hari === "tanpa") return isi;
  const pekan = new Date(Date.UTC(th, bl - 1, tg)).getUTCDay();
  return `${(hari === "panjang" ? HARI_PANJANG : HARI_PENDEK)[pekan]}, ${isi}`;
}

/** `2026-10-23` → `23 Okt` — sumbu grafik, kartu. */
export function tanggalPendek(t: string): string {
  const [, bl, tg] = t.split("-").map(Number);
  return bl && tg ? `${tg} ${BULAN[bl - 1]}` : t;
}

/** `2026-09-10` → `10 Sep 26` (mis. tanggal akad di kartu). */
export function tanggalBertahun(t: string): string {
  const [th, bl, tg] = t.split("-");
  return `${Number(tg)} ${BULAN[Number(bl) - 1]} ${(th ?? "").slice(2)}`;
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

/** Waktu di jam perangkat → `26 Okt 04.55` (cap waktu singkat di HP). */
export function waktuPendek(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${hh}.${mm}`;
}
