import { useQuery } from "@tanstack/react-query";
import { kueri } from "@/lib/api";

/**
 * Bacaan tab pantau mode Semua. Semuanya berawalan kunci `lapangan`, jadi
 * ikut segar sesudah tiap transaksi lapangan; catatan kasir (transfer, biaya,
 * serah terima) masuk saat layar ditarik atau aplikasi kembali dibuka. Hari kas
 * kolektor (`useKasHariIni`) ada di `@/fitur/lapangan` — dipakai juga gembok
 * Mutasi & Notifikasi.
 */

/** Setoran berlaku kolektor ini hari ini (tab Storting). */
export function useSetoranHariIni() {
  return useQuery(kueri.lapangan.setoran());
}

/** Biaya tak terduga yang dicatat kasir untuk kolektor ini pada `tanggal` (tab Mutasi). */
export function useBiayaHariIni(tanggal: string | undefined) {
  return useQuery(kueri.lapangan.biaya(tanggal));
}
