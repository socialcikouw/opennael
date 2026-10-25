import { waktuKantor, type ZonaWaktu } from "@opennael/domain";
import { useSesi } from "./sesi";

/** Kantor bos yang sedang masuk; layar bos hanya tampil bila sesi ada. */
export function useKantor() {
  const s = useSesi();
  if (!s) throw new Error("Sesi bos tidak ada");
  return s.pengguna.kantor;
}

/** Tanggal pembukuan hari ini menurut zona kantor. */
export function hariIniKantor(zona: ZonaWaktu): string {
  return waktuKantor(new Date(), zona).tanggal;
}

export function useHariIni(): string {
  return hariIniKantor(useKantor().zonaWaktu);
}

/** Saringan pencarian rute: tanggal `YYYY-MM-DD` yang sah atau tidak ada. */
export function tanggalSah(nilai: unknown): string | undefined {
  return typeof nilai === "string" && /^\d{4}-\d{2}-\d{2}$/.test(nilai) ? nilai : undefined;
}

/** Saringan pencarian rute: teks tak kosong atau tidak ada. */
export function teksSah(nilai: unknown): string | undefined {
  return typeof nilai === "string" && nilai.length > 0 ? nilai : undefined;
}
