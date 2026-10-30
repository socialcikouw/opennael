import { useQueryClient } from "@tanstack/react-query";
import { ambil, api } from "@/lib/api";

// ---- kantor -------------------------------------------------------------------------

export const ambilKantor = () => ambil(() => api.kantor.kantor.$get());

// ---- kampung ------------------------------------------------------------------------

export const ambilKampung = (baru: boolean) =>
  ambil(() => api.kantor.wilayah.$get({ query: baru ? { baru: "7" } : {} }));

export type Kampung = Awaited<ReturnType<typeof ambilKampung>>[number];

/** Segarkan semua yang memuat nama kampung. */
export function useSegarkanKampung() {
  const klien = useQueryClient();
  return () => {
    for (const k of [["wilayah"], ["nasabah"], ["rute-kolektor"]]) {
      void klien.invalidateQueries({ queryKey: k });
    }
  };
}
