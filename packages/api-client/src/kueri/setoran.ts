import { queryOptions } from "@tanstack/react-query";
import { kunci } from "../kunci";
import type { Bahan } from "./dasar";

/**
 * Kueri HP kasir & pengawas (hari kolektor, setoran, biaya tak terduga). Semua
 * kuncinya berawalan `kunci.setoran`, jadi satu `invalidateQueries` sesudah
 * tulisan kasir menyegarkan semuanya.
 */
export function kueriSetoran({ api, ambil }: Bahan) {
  return {
    setoran: {
      /** Semua kolektor hari ini; dimuat ulang tiap 30 detik (kolektor membuka laporan). */
      hari: () =>
        queryOptions({
          queryKey: [...kunci.setoran, "hari"],
          queryFn: () => ambil(() => api.hariKolektor["hari-kolektor"].$get({ query: {} })),
          refetchInterval: 30_000,
        }),
      /** Setoran berlaku satu kolektor hari ini, beserta transfernya. */
      transaksi: (kolektorId: string) =>
        queryOptions({
          queryKey: [...kunci.setoran, "transaksi", kolektorId],
          queryFn: () => ambil(() => api.hariKolektor.transaksi.$get({ query: { kolektorId } })),
        }),
      /** Biaya tak terduga satu kolektor pada `tanggal` (yang berlaku). */
      biaya: (kolektorId: string, tanggal: string | undefined) =>
        queryOptions({
          queryKey: [...kunci.setoran, "biaya", kolektorId, tanggal],
          queryFn: () =>
            ambil(() =>
              api.hariKolektor["biaya-tak-terduga"].$get({
                query: { kolektorId, tanggalMulai: tanggal, tanggalSelesai: tanggal },
              }),
            ),
          enabled: tanggal !== undefined,
        }),
    },
  };
}
