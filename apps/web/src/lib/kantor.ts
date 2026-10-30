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
