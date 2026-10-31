import { kunci } from "@opennael/api-client";
import type { Peristiwa } from "@opennael/contracts";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, kueri, panggil } from "@/lib/api";

/**
 * DATA LAPANGAN KOLEKTOR — kueri bersama layar kerja harian, kartu pinjaman,
 * akad, dan gulung (katalog `kueri.lapangan`, kunci berawalan `kunci.lapangan`).
 * Setiap tulisan menyegarkan semua kueri `lapangan`.
 */

export function useHariIni() {
  return useQuery(kueri.lapangan.hariIni());
}

export function useTagihan() {
  return useQuery(kueri.lapangan.tagihan());
}

/** Kalender kantor sebulan (`YYYY-MM`): hari tagih & libur kantor — bahan grid kartu. */
export function useKalenderBulan(bulan: string | undefined) {
  return useQuery(kueri.lapangan.kalender(bulan));
}

/**
 * Peristiwa (setoran, lunas, gulung, libur) pegangan kolektor ini dari awal
 * bulan s/d hari ini — isi grid setoran sebulan di kartu. Server membatasi
 * kolektor ke pegangannya sendiri.
 */
export function usePeristiwaBulan(hariIni: string | undefined) {
  return useQuery(kueri.lapangan.peristiwaBulan(hariIni));
}

/**
 * Seluruh riwayat beberapa pinjaman (satu permintaan per pinjaman) — kotak
 * mingguan sepanjang tenor bisa melewati sebulan. Peta tetap sama selama
 * isinya tak berubah, jadi kartu tak disusun ulang sia-sia.
 */
export function useRiwayatPinjaman(ids: readonly string[]) {
  return useQueries({
    queries: ids.map((id) => kueri.lapangan.riwayatPinjaman(id)),
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
  return useQuery(kueri.lapangan.kampung());
}

export function useNasabahLama() {
  return useQuery(kueri.lapangan.nasabahLama());
}

/** Tulisan lapangan; galat server (gerbang, aturan) menjadi `error.message`. */
export function useTulis<I, O>(kirim: (input: I) => Promise<O>) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: kirim,
    onSettled: () => klien.invalidateQueries({ queryKey: kunci.lapangan }),
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
