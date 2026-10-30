import { useQuery } from "@tanstack/react-query";
import { ambil, api } from "@/lib/api";

/**
 * BUKU NASABAH di rincian nasabah — semua pinjaman (kartu dengan posisi tagih
 * & kunci gulung) dan semua peristiwa berlaku. Satu kueri `GET /nasabah/:id/buku`
 * dipakai kedua tab.
 */

export const kunciBuku = (id: string) => ["nasabah", "buku", id];

export function useBuku(nasabahId: string) {
  return useQuery({
    queryKey: kunciBuku(nasabahId),
    queryFn: () =>
      ambil(() => api.pembiayaan.nasabah[":id"].buku.$get({ param: { id: nasabahId } })),
  });
}
