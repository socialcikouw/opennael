import type { Peristiwa } from "@opennael/contracts";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, panggil } from "@/lib/api";

/**
 * DATA LAPANGAN KOLEKTOR — kueri bersama layar kerja harian, kartu pinjaman,
 * akad, dan gulung. Setiap tulisan menyegarkan semua kueri `lapangan`.
 */
const KUNCI = ["lapangan"] as const;

export function useHariIni() {
  return useQuery({
    queryKey: [...KUNCI, "hari-ini"],
    queryFn: async () => (await panggil(() => api.hariKolektor.lapangan["hari-ini"].$get())).json(),
  });
}

export function useTagihan() {
  return useQuery({
    queryKey: [...KUNCI, "pinjaman"],
    queryFn: async () => (await panggil(() => api.pembiayaan.lapangan.pinjaman.$get())).json(),
  });
}

/** Kalender kantor sebulan (`YYYY-MM`): hari tagih & libur kantor — bahan grid kartu. */
export function useKalenderBulan(bulan: string | undefined) {
  return useQuery({
    queryKey: [...KUNCI, "kalender", bulan],
    enabled: !!bulan,
    staleTime: 60 * 60 * 1000,
    queryFn: async () =>
      (
        await panggil(() => api.kantor.lapangan.kalender.$get({ query: { bulan: bulan ?? "" } }))
      ).json(),
  });
}

/**
 * Peristiwa (setoran, lunas, gulung, libur) pegangan kolektor ini dari awal
 * bulan s/d hari ini — isi grid setoran sebulan di kartu. Server membatasi
 * kolektor ke pegangannya sendiri.
 */
export function usePeristiwaBulan(hariIni: string | undefined) {
  const awal = hariIni ? `${hariIni.slice(0, 7)}-01` : "";
  return useQuery({
    queryKey: [...KUNCI, "peristiwa-bulan", hariIni],
    enabled: !!hariIni,
    queryFn: async () =>
      (
        await panggil(() =>
          api.pembiayaan.transaksi.peristiwa.$get({
            query: { tanggalMulai: awal, tanggalSelesai: hariIni ?? "" },
          }),
        )
      ).json(),
  });
}

/**
 * Seluruh riwayat beberapa pinjaman (satu permintaan per pinjaman) — kotak
 * mingguan sepanjang tenor bisa melewati sebulan. Peta tetap sama selama
 * isinya tak berubah, jadi kartu tak disusun ulang sia-sia.
 */
export function useRiwayatPinjaman(ids: readonly string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [...KUNCI, "peristiwa-pinjaman", id],
      queryFn: async () =>
        (
          await panggil(() =>
            api.pembiayaan.transaksi.peristiwa.$get({ query: { pinjamanId: id } }),
          )
        ).json(),
    })),
    combine: gabungRiwayat,
  });
}

function gabungRiwayat(hasil: { data?: Peristiwa[] | undefined }[]) {
  const peta = new Map<string, readonly Peristiwa[]>();
  for (const h of hasil) {
    const pertama = h.data?.[0];
    if (pertama) peta.set(pertama.pinjamanId, h.data ?? []);
  }
  return peta;
}

export function useKampung() {
  return useQuery({
    queryKey: [...KUNCI, "kampung"],
    queryFn: async () => (await panggil(() => api.kantor.lapangan.kampung.$get())).json(),
  });
}

export function useNasabahLama() {
  return useQuery({
    queryKey: [...KUNCI, "nasabah-lama"],
    queryFn: async () =>
      (await panggil(() => api.pembiayaan.lapangan["nasabah-lama"].$get())).json(),
  });
}

/** Tulisan lapangan; galat server (gerbang, aturan) menjadi `error.message`. */
export function useTulis<I, O>(kirim: (input: I) => Promise<O>) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: kirim,
    onSettled: () => klien.invalidateQueries({ queryKey: KUNCI }),
  });
}

/** Penulis per operasi — bentuk isi mengikuti kontrak `@opennael/contracts`. */
export const tulis = {
  absen: async (json: Parameters<typeof api.hariKolektor.lapangan.absen.$post>[0]["json"]) =>
    (await panggil(() => api.hariKolektor.lapangan.absen.$post({ json }))).json(),
  laporan: async () => (await panggil(() => api.hariKolektor.lapangan.laporan.$post())).json(),
  akad: async (json: Parameters<typeof api.pembiayaan.lapangan.akad.$post>[0]["json"]) =>
    (await panggil(() => api.pembiayaan.lapangan.akad.$post({ json }))).json(),
  bayar: async (json: Parameters<typeof api.pembiayaan.lapangan.bayar.$post>[0]["json"]) =>
    (await panggil(() => api.pembiayaan.lapangan.bayar.$post({ json }))).json(),
  lunas: async (pinjamanId: string) =>
    (await panggil(() => api.pembiayaan.lapangan.lunas.$post({ json: { pinjamanId } }))).json(),
  gulung: async (json: Parameters<typeof api.pembiayaan.lapangan.gulung.$post>[0]["json"]) =>
    (await panggil(() => api.pembiayaan.lapangan.gulung.$post({ json }))).json(),
  libur: async (json: Parameters<typeof api.pembiayaan.lapangan.libur.$post>[0]["json"]) =>
    (await panggil(() => api.pembiayaan.lapangan.libur.$post({ json }))).json(),
};
