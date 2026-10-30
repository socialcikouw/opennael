import { waktuKantor, type ZonaWaktu } from "@opennael/domain";

/** Tanggal pembukuan hari ini menurut zona kantor. */
export function hariIniKantor(zona: ZonaWaktu): string {
  return waktuKantor(new Date(), zona).tanggal;
}
