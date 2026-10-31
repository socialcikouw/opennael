import { queryOptions } from "@tanstack/react-query";
import { kunci } from "../kunci";
import type { Bahan } from "./dasar";

/** Kueri konteks kantor: profil, pekan kerja, libur, kampung, dan rem (kebijakan). */
export function kueriKantor({ api, ambil }: Bahan) {
  return {
    kantor: {
      profil: () =>
        queryOptions({
          queryKey: kunci.kantor,
          queryFn: () => ambil(() => api.kantor.kantor.$get()),
        }),
      /** Riwayat penetapan pekan kerja. */
      pekanKerja: () =>
        queryOptions({
          queryKey: [...kunci.kantor, "pekan-kerja"],
          queryFn: () => ambil(() => api.kantor.kantor["pekan-kerja"].$get()),
        }),
    },
    /** Kampung (wilayah) milik kantor; `baru` hanya yang dibuat 7 hari terakhir. */
    wilayah: {
      daftar: (baru = false) =>
        queryOptions({
          queryKey: [...kunci.wilayah, baru],
          queryFn: () => ambil(() => api.kantor.wilayah.$get({ query: baru ? { baru: "7" } : {} })),
        }),
    },
    /** Nama kampung untuk isian salin buku (rute lapangan). */
    kampung: () =>
      queryOptions({
        queryKey: kunci.kampung,
        queryFn: () => ambil(() => api.kantor.lapangan.kampung.$get()),
      }),
    liburKantor: {
      /** Libur kantor dari `mulai` sampai `sampai`. */
      daftar: (mulai: string, sampai: string) =>
        queryOptions({
          queryKey: [...kunci.liburKantor, mulai, sampai],
          queryFn: () =>
            ambil(() =>
              api.kantor["libur-kantor"].$get({
                query: { tanggalMulai: mulai, tanggalSelesai: sampai },
              }),
            ),
        }),
    },
    kebijakan: {
      aktif: () =>
        queryOptions({
          queryKey: [...kunci.kebijakan, "aktif"],
          queryFn: () => ambil(() => api.kantor.kebijakan.aktif.$get()),
        }),
    },
  };
}
