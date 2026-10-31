import { waktuKantor, type ZonaWaktu } from "@opennael/domain";
import { useSesi } from "./sesi";

/** Tanggal pembukuan hari ini menurut zona kantor. */
export function hariIniKantor(zona: ZonaWaktu): string {
  return waktuKantor(new Date(), zona).tanggal;
}

/** Zona waktu kantor pengguna yang masuk (WIB bila sesi belum terbaca) — untuk jam dinding kantor. */
export function useZonaKantor(): ZonaWaktu {
  return useSesi()?.pengguna.kantor.zonaWaktu ?? "WIB";
}
