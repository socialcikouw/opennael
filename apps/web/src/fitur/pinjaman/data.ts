import { useQuery } from "@tanstack/react-query";
import { kueri } from "@/lib/api";

/**
 * BUKU NASABAH di rincian nasabah — semua pinjaman (kartu dengan posisi tagih
 * & kunci gulung) dan semua peristiwa berlaku. Satu kueri `GET /nasabah/:id/buku`
 * dipakai kedua tab.
 */
export function useBuku(nasabahId: string) {
  return useQuery(kueri.nasabah.buku(nasabahId));
}
