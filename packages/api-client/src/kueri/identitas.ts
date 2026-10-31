import { queryOptions } from "@tanstack/react-query";
import type { Bahan } from "../bahan";
import { kunci } from "../kunci";

/** Kueri konteks identitas: orang di kantor dan perangkat tertautnya. */
export function kueriIdentitas({ api, ambil }: Bahan) {
  return {
    pengguna: {
      /** Semua orang di kantor, termasuk yang nonaktif (daftar karyawan, penautan, aktivitas). */
      semua: () =>
        queryOptions({
          queryKey: [...kunci.pengguna, "semua"],
          queryFn: () =>
            ambil(() => api.identitas.pengguna.$get({ query: { termasukNonaktif: "ya" } })),
        }),
      /** Kolektor aktif — pilihan kolektor di hampir semua layar bos. */
      kolektor: () =>
        queryOptions({
          queryKey: [...kunci.pengguna, "kolektor"],
          queryFn: () => ambil(() => api.identitas.pengguna.$get({ query: { peran: "kolektor" } })),
        }),
    },
    perangkat: {
      /** Perangkat tertaut; `riwayat` ikut menyertakan yang sudah diputus. */
      daftar: (riwayat: boolean) =>
        queryOptions({
          queryKey: [...kunci.perangkat, riwayat],
          queryFn: () =>
            ambil(() =>
              api.identitas.auth.perangkat.$get({
                query: riwayat ? { termasukDiputus: "true" } : {},
              }),
            ),
        }),
    },
  };
}
