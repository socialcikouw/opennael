import { queryOptions } from "@tanstack/react-query";
import { kunci } from "../kunci";
import type { Bahan } from "./dasar";

/** Kueri konteks hari kolektor: layar harian bos (setoran sore) dan rute kolektor. */
export function kueriHariKolektor({ api, ambil }: Bahan) {
  return {
    harian: {
      /** Absen, laporan, dan serah terima kas semua kolektor pada `tanggal`. */
      hariKolektor: (tanggal: string) =>
        queryOptions({
          queryKey: [...kunci.harian, "hari-kolektor", tanggal],
          queryFn: () =>
            ambil(() => api.hariKolektor["hari-kolektor"].$get({ query: { tanggal } })),
        }),
      /** Setoran nasabah pada `tanggal`; `kolektorId` kosong = semua kolektor. */
      transaksi: (tanggal: string, kolektorId = "") =>
        queryOptions({
          queryKey: [...kunci.harian, "transaksi", tanggal, kolektorId],
          queryFn: () =>
            ambil(() =>
              api.hariKolektor.transaksi.$get({
                query: { tanggal, ...(kolektorId ? { kolektorId } : {}) },
              }),
            ),
        }),
      transfer: (tanggal: string) =>
        queryOptions({
          queryKey: [...kunci.harian, "transfer", tanggal],
          queryFn: () =>
            ambil(() => api.hariKolektor["transfer-setoran"].$get({ query: { tanggal } })),
        }),
      /** Nasabah libur pada `tanggal` (peristiwa kategori libur). */
      libur: (tanggal: string) =>
        queryOptions({
          queryKey: [...kunci.harian, "libur", tanggal],
          queryFn: async () =>
            (
              await ambil(() => api.pembiayaan.transaksi.peristiwa.$get({ query: { tanggal } }))
            ).filter((p) => p.kategori === "libur"),
        }),
      /** Biaya tak terduga pada `tanggal`, yang dibatalkan ikut tampil. */
      biaya: (tanggal: string) =>
        queryOptions({
          queryKey: [...kunci.harian, "biaya", tanggal],
          queryFn: () =>
            ambil(() =>
              api.hariKolektor["biaya-tak-terduga"].$get({
                query: { tanggalMulai: tanggal, tanggalSelesai: tanggal, termasukBatal: "ya" },
              }),
            ),
        }),
    },
    ruteKolektor: {
      /** Urutan kampung satu kolektor; menunggu sampai kolektornya dipilih. */
      urutan: (kolektorId: string) =>
        queryOptions({
          queryKey: [...kunci.ruteKolektor, kolektorId],
          queryFn: () =>
            ambil(() => api.hariKolektor["rute-kolektor"].$get({ query: { kolektorId } })),
          enabled: kolektorId !== "",
        }),
    },
  };
}
