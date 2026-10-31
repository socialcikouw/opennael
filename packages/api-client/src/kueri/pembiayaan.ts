import { queryOptions } from "@tanstack/react-query";
import { kunci } from "../kunci";
import type { Bahan } from "./dasar";

/** Kueri konteks pembiayaan: nasabah dan pinjaman (layar bos, pengawas). */
export function kueriPembiayaan({ api, ambil }: Bahan) {
  return {
    nasabah: {
      /** Daftar nasabah; `cari` (nama/NIK/…) dan `kolektorId` menyaring. */
      daftar: (cari?: string, kolektorId?: string) =>
        queryOptions({
          queryKey: [...kunci.nasabah, "daftar", cari ?? null, kolektorId ?? null],
          queryFn: () =>
            ambil(() =>
              api.pembiayaan.nasabah.$get({
                query: { ...(cari ? { cari } : {}), ...(kolektorId ? { kolektorId } : {}) },
              }),
            ),
        }),
      /** Nasabah lama yang bebas pinjaman (salin buku); mulai mencari dari 2 huruf. */
      bebas: (cari: string) =>
        queryOptions({
          queryKey: [...kunci.nasabah, "bebas", cari],
          queryFn: () => ambil(() => api.pembiayaan.nasabah.$get({ query: { cari, bebas: "ya" } })),
          enabled: cari.length >= 2,
        }),
      /** Nasabah yang mirip nama/kampung/NIK (peringatan dobel); mulai dari 2 huruf nama. */
      serupa: (nama: string, kampung: string, nik?: string) =>
        queryOptions({
          queryKey: [...kunci.nasabah, "serupa", nama, kampung, nik ?? null],
          queryFn: () =>
            ambil(() =>
              api.pembiayaan.nasabah.serupa.$get({
                query: { nama, ...(kampung ? { kampung } : {}), ...(nik ? { nik } : {}) },
              }),
            ),
          enabled: nama.length >= 2,
        }),
      neraca: (id: string) =>
        queryOptions({
          queryKey: [...kunci.nasabah, "neraca", id],
          queryFn: () => ambil(() => api.pembiayaan.nasabah[":id"].neraca.$get({ param: { id } })),
        }),
      /** Semua pinjaman dan peristiwa berlaku satu nasabah (buku nasabah, dua tab). */
      buku: (id: string) =>
        queryOptions({
          queryKey: [...kunci.nasabah, "buku", id],
          queryFn: () => ambil(() => api.pembiayaan.nasabah[":id"].buku.$get({ param: { id } })),
        }),
      penarikanTabungan: (id: string) =>
        queryOptions({
          queryKey: [...kunci.nasabah, "penarikan", id],
          queryFn: () =>
            ambil(() =>
              api.pembiayaan.nasabah[":id"]["penarikan-tabungan"].$get({ param: { id } }),
            ),
        }),
      koreksiTabungan: (id: string) =>
        queryOptions({
          queryKey: [...kunci.nasabah, "koreksi", id],
          queryFn: () =>
            ambil(() => api.pembiayaan.nasabah[":id"]["koreksi-tabungan"].$get({ param: { id } })),
        }),
    },
    pinjaman: {
      /** Daftar pinjaman menurut `status`; `kolektorId` menyaring pemegang. */
      daftar: (status: "aktif" | "selesai" | "semua", kolektorId?: string) =>
        queryOptions({
          queryKey: [...kunci.pinjaman, "daftar", status, kolektorId ?? null],
          queryFn: () =>
            ambil(() =>
              api.pembiayaan.pinjaman.$get({
                query: { status, ...(kolektorId ? { kolektorId } : {}) },
              }),
            ),
        }),
      /** Pinjaman aktif (berjalan & macet) tanpa saringan — layar tunggakan pengawas di HP. */
      aktif: () =>
        queryOptions({
          queryKey: [...kunci.pinjaman, "aktif"],
          queryFn: () => ambil(() => api.pembiayaan.pinjaman.$get({ query: { status: "aktif" } })),
        }),
      rincian: (id: string) =>
        queryOptions({
          queryKey: [...kunci.pinjaman, id],
          queryFn: () => ambil(() => api.pembiayaan.pinjaman[":id"].$get({ param: { id } })),
        }),
      riwayatStatus: (id: string) =>
        queryOptions({
          queryKey: [...kunci.pinjaman, "riwayat-status", id],
          queryFn: () =>
            ambil(() => api.pembiayaan.pinjaman[":id"]["riwayat-status"].$get({ param: { id } })),
        }),
    },
  };
}
