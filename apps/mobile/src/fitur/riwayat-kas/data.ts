import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { kueri } from "@/lib/api";
import type { BulanPerforma } from "@/lib/bulan";

/**
 * Bacaan RIWAYAT KAS kolektor ini — semuanya di bawah kunci `lapangan` (ikut segar sesudah
 * tiap transaksi lapangan; catatan kasir masuk saat ditarik atau dibuka ulang).
 */

/** Hari-hari satu bulan (ringan); ganti bulan menahan angka lama sampai yang baru tiba. */
export function useRiwayatBulan(bulan: BulanPerforma | null) {
  return useQuery({
    ...kueri.lapangan.riwayatKas(bulan?.mulai ?? "", bulan?.selesai ?? ""),
    placeholderData: keepPreviousData,
  });
}

/** Satu hari: rincian tunai seharusnya (I1) & serah terima, beserta biaya tak terduganya. */
export function useHariKas(tanggal: string) {
  const kas = useQuery(kueri.lapangan.kasTanggal(tanggal));
  const biaya = useQuery(kueri.lapangan.biaya(tanggal));
  return { kas, biaya };
}
