import { queryOptions } from "@tanstack/react-query";
import type { Bahan } from "../bahan";
import { kunci } from "../kunci";

/** Kueri konteks kas: buku kas, pencocokan, dan posisi modal. */
export function kueriKas({ api, ambil }: Bahan) {
  return {
    kas: {
      laporan: (mulai: string, selesai: string) =>
        queryOptions({
          queryKey: [...kunci.kas, "laporan", mulai, selesai],
          queryFn: () => ambil(() => api.kas.kas.laporan.$get({ query: { mulai, selesai } })),
        }),
      pencocokan: (mulai: string, selesai: string) =>
        queryOptions({
          queryKey: [...kunci.kas, "pencocokan", mulai, selesai],
          queryFn: () => ambil(() => api.kas.kas.pencocokan.$get({ query: { mulai, selesai } })),
        }),
      posisiModal: (tanggal: string) =>
        queryOptions({
          queryKey: [...kunci.kas, "posisi-modal", tanggal],
          queryFn: () => ambil(() => api.kas.kas["posisi-modal"].$get({ query: { tanggal } })),
        }),
    },
  };
}
