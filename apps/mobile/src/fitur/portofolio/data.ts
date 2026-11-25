import { useQuery } from "@tanstack/react-query";
import { kueri } from "@/lib/api";

/**
 * Portofolio pegangan kolektor per jenis & status (`GET /lapangan/portofolio`). Berawalan kunci
 * `lapangan`, jadi ikut segar sesudah tiap transaksi lapangan.
 */
export function useDataPortofolio() {
  return useQuery(kueri.lapangan.portofolio());
}
