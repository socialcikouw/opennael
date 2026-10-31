import type { TabelBerjejak } from "@opennael/contracts";
import { queryOptions } from "@tanstack/react-query";
import type { Bahan } from "../bahan";
import { kunci } from "../kunci";

/** Kueri konteks pelaporan: ringkasan beranda, aktivitas, dan jejak perubahan. */
export function kueriPelaporan({ api, ambil }: Bahan) {
  return {
    ringkasan: {
      /** Ringkasan satu hari. */
      hari: (tanggal: string) =>
        queryOptions({
          queryKey: [...kunci.ringkasan, tanggal],
          queryFn: () =>
            ambil(() =>
              api.pelaporan.ringkasan.$get({ query: { mulai: tanggal, selesai: tanggal } }),
            ),
        }),
      perKolektor: (tanggal: string) =>
        queryOptions({
          queryKey: [...kunci.ringkasan, "per-kolektor", tanggal],
          queryFn: () =>
            ambil(() =>
              api.pelaporan.ringkasan["per-kolektor"].$get({
                query: { mulai: tanggal, selesai: tanggal },
              }),
            ),
        }),
      performa: (mulai: string, sampai: string) =>
        queryOptions({
          queryKey: [...kunci.ringkasan, "performa", mulai, sampai],
          queryFn: () =>
            ambil(() =>
              api.pelaporan.ringkasan.performa.$get({ query: { mulai, selesai: sampai } }),
            ),
        }),
    },
    aktivitas: {
      /** Siapa melakukan apa pada `tanggal`; `pelakuId` menyaring satu orang. */
      hari: (tanggal: string, pelakuId?: string) =>
        queryOptions({
          queryKey: [...kunci.aktivitas, tanggal, pelakuId ?? null],
          queryFn: () =>
            ambil(() =>
              api.pelaporan.aktivitas.$get({
                query: { tanggal, ...(pelakuId ? { pelakuId } : {}) },
              }),
            ),
        }),
    },
    riwayat: {
      /** Jejak perubahan satu baris data: sebelum → sesudah per kolom. */
      perubahan: (tabel: TabelBerjejak, barisId: string) =>
        queryOptions({
          queryKey: [...kunci.riwayat, tabel, barisId],
          queryFn: () => ambil(() => api.pelaporan.riwayat.$get({ query: { tabel, barisId } })),
        }),
    },
  };
}
