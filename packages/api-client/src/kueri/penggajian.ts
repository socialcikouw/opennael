import { queryOptions } from "@tanstack/react-query";
import type { Bahan } from "../bahan";
import { kunci } from "../kunci";

/** Kueri konteks penggajian: pratinjau dan slip gaji kolektor, tarif gaji. */
export function kueriPenggajian({ api, ambil }: Bahan) {
  return {
    gaji: {
      pratinjau: (kolektorId: string, mulai: string, selesai: string) =>
        queryOptions({
          queryKey: [...kunci.gaji, "pratinjau", kolektorId, mulai, selesai],
          queryFn: () =>
            ambil(() =>
              api.penggajian.kas.gaji.pratinjau.$get({ query: { kolektorId, mulai, selesai } }),
            ),
        }),
      /** Slip yang sudah dibayar; `kolektorId` menyaring satu kolektor. */
      slip: (kolektorId?: string) =>
        queryOptions({
          queryKey: [...kunci.gaji, "slip", kolektorId ?? null],
          queryFn: () =>
            ambil(() => api.penggajian.kas.gaji.$get({ query: kolektorId ? { kolektorId } : {} })),
        }),
    },
    tarifGaji: {
      daftar: () =>
        queryOptions({
          queryKey: kunci.tarifGaji,
          queryFn: () => ambil(() => api.penggajian["tarif-gaji"].$get()),
        }),
    },
  };
}
