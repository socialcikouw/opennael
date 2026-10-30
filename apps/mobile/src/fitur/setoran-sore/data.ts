import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, panggil } from "@/lib/api";

/**
 * DATA SETORAN SORE — hari kolektor hari ini (absen, laporan, serah terima),
 * setoran per kolektor (pilihan transfer), biaya tak terduga. Dipakai kasir
 * (mencatat) dan pengawas (membaca). Setiap tulisan menyegarkan semua kueri
 * `setoran`. Hitung buta: rincian tunai seharusnya baru dijawab server
 * sesudah kas diterima.
 */
const KUNCI = ["setoran"] as const;

/** Semua kolektor hari ini; dimuat ulang tiap 30 detik (kolektor membuka laporan). */
export function useHariKolektor() {
  return useQuery({
    queryKey: [...KUNCI, "hari"],
    queryFn: async () =>
      (await panggil(() => api.hariKolektor["hari-kolektor"].$get({ query: {} }))).json(),
    refetchInterval: 30_000,
  });
}

export type HariKolektor = NonNullable<ReturnType<typeof useHariKolektor>["data"]>[number];

/** Setoran berlaku satu kolektor hari ini, beserta transfernya. */
export function useSetoranKolektor(kolektorId: string) {
  return useQuery({
    queryKey: [...KUNCI, "transaksi", kolektorId],
    queryFn: async () =>
      (await panggil(() => api.hariKolektor.transaksi.$get({ query: { kolektorId } }))).json(),
  });
}

/** Biaya tak terduga satu kolektor pada `tanggal` (yang berlaku). */
export function useBiayaKolektor(kolektorId: string, tanggal: string | undefined) {
  return useQuery({
    queryKey: [...KUNCI, "biaya", kolektorId, tanggal],
    queryFn: async () =>
      (
        await panggil(() =>
          api.hariKolektor["biaya-tak-terduga"].$get({
            query: { kolektorId, tanggalMulai: tanggal, tanggalSelesai: tanggal },
          }),
        )
      ).json(),
    enabled: tanggal !== undefined,
  });
}

/** Tulisan kasir; galat server (hari terkunci, batas transfer) menjadi `error.message`. */
export function useTulisSetoran<I, O>(kirim: (input: I) => Promise<O>) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: kirim,
    onSettled: () => klien.invalidateQueries({ queryKey: KUNCI }),
  });
}

export const tulisSetoran = {
  terimaKas: async (isi: { kolektorId: string; tunaiDiterima: number }) =>
    (
      await panggil(() =>
        api.hariKolektor["hari-kolektor"][":kolektorId"]["terima-kas"].$post({
          param: { kolektorId: isi.kolektorId },
          json: { tunaiDiterima: isi.tunaiDiterima },
        }),
      )
    ).json(),
  transfer: async (
    json: Parameters<(typeof api.hariKolektor)["transfer-setoran"]["$post"]>[0]["json"],
  ) => (await panggil(() => api.hariKolektor["transfer-setoran"].$post({ json }))).json(),
  biaya: async (
    json: Parameters<(typeof api.hariKolektor)["biaya-tak-terduga"]["$post"]>[0]["json"],
  ) => (await panggil(() => api.hariKolektor["biaya-tak-terduga"].$post({ json }))).json(),
};
