import { kunci } from "@opennael/api-client";
import type { Peristiwa } from "@opennael/contracts";
import {
  type QueryClient,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { api, kueri, panggil } from "@/lib/api";
import { bacaPosisi } from "@/platform/lokasi";
import { type TitikRumah, titikRumahDari } from "./inti/titik-rumah";

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

/**
 * Menyegarkan semua bacaan lapangan (kunci berawalan `lapangan`) — untuk tarik-untuk-
 * menyegarkan di layar rincian; janjinya selesai saat bacaan yang tampil sudah baru.
 */
export function useSegarkanLapangan() {
  const klien = useQueryClient();
  return useCallback(() => klien.invalidateQueries({ queryKey: kunci.lapangan }), [klien]);
}

/** Satu nasabah pegangan (kampung, HP, tabungan, titik rumah) — detail nasabah. */
export function useNasabah(id: string) {
  return useQuery(kueri.lapangan.nasabah(id));
}

/** Semua pinjaman satu nasabah pegangan (aktif dan selesai) — detail nasabah. */
export function usePinjamanNasabah(id: string) {
  return useQuery(kueri.lapangan.pinjamanNasabah(id));
}

/**
 * Rekam titik rumah dari GPS HP sekarang (pegangan kolektor ini): baca posisi, periksa
 * akurasi & wilayah, kirim, lalu segarkan bacaan lapangan supaya detail nasabah memuatnya.
 */
export function useRekamTitikRumah(id: string) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: async () => tulis.lokasiRumah(id, titikRumahDari(await bacaPosisi())),
    onSuccess: () => klien.invalidateQueries({ queryKey: kunci.lapangan }),
  });
}

/**
 * Akad baru + titik rumah dari GPS latar. Titik dikirim SESUDAH akad berhasil, tanpa
 * ditunggu layar: orang baru selalu belum punya titik; nasabah lama hanya bila titiknya
 * masih kosong (yang sudah direkam tak ditimpa diam-diam). GPS hanya tambahan — gagal
 * merekam tak menggagalkan akad (titiknya masih bisa direkam dari Detail Nasabah).
 */
export function useAkad() {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: async (masuk: {
      akad: Parameters<typeof tulis.akad>[0];
      titik: TitikRumah | null;
    }) => {
      const pinjaman = await tulis.akad(masuk.akad);
      if (masuk.titik) {
        const nasabahLama = "nasabahId" in masuk.akad.nasabah;
        void rekamTitikSesudahAkad(klien, pinjaman.nasabah.id, masuk.titik, nasabahLama);
      }
      return pinjaman;
    },
    onSettled: () => klien.invalidateQueries({ queryKey: kunci.lapangan }),
  });
}

async function rekamTitikSesudahAkad(
  klien: QueryClient,
  nasabahId: string,
  titik: TitikRumah,
  nasabahLama: boolean,
) {
  try {
    if (nasabahLama) {
      const nasabah = await klien.fetchQuery(kueri.lapangan.nasabah(nasabahId));
      if (nasabah.lokasi) return;
    }
    await tulis.lokasiRumah(nasabahId, titik);
    await klien.invalidateQueries({ queryKey: kunci.lapangan });
  } catch {
    // Sengaja diam: akadnya sudah tercatat; titik rumah bisa direkam ulang dari Detail Nasabah.
  }
}

/**
 * Mulai mengambil detail nasabah (data dan pinjamannya) sebelum layarnya dibuka —
 * dipanggil saat jari menekan nama di kartu, jadi sudah di jalan ketika dilepas.
 * Yang masih segar di memori tak diambil ulang; galat diabaikan (layar detail
 * mengambil sendiri).
 */
export function useSiapkanNasabah() {
  const klien = useQueryClient();
  return useCallback(
    (id: string) => {
      void klien.prefetchQuery(kueri.lapangan.nasabah(id));
      void klien.prefetchQuery(kueri.lapangan.pinjamanNasabah(id));
    },
    [klien],
  );
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
export function useRiwayatPinjaman(
  ids: readonly string[],
): ReadonlyMap<string, readonly Peristiwa[]> {
  const rekam = useQueries({
    queries: ids.map((id) => kueri.lapangan.riwayatPinjaman(id)),
    combine: gabungRiwayat,
  });
  // `combine` mengembalikan objek polos supaya berbagi-struktur TanStack bekerja (ia tak
  // menyentuh `Map`); petanya dibungkus sesudahnya dan hanya berganti bila isinya berganti.
  return useMemo(() => new Map(Object.entries(rekam)), [rekam]);
}

function gabungRiwayat(hasil: { data?: Peristiwa[] | undefined }[]) {
  const rekam: Record<string, readonly Peristiwa[]> = {};
  for (const h of hasil) {
    const pertama = h.data?.[0];
    if (pertama) rekam[pertama.pinjamanId] = h.data ?? [];
  }
  return rekam;
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
  /** Rekam titik rumah nasabah pegangan (menimpa yang lama; yang lama tercatat di riwayat server). */
  lokasiRumah: async (
    id: string,
    json: Parameters<(typeof api.pembiayaan.nasabah)[":id"]["lokasi"]["$put"]>[0]["json"],
  ) =>
    (
      await panggil(() => api.pembiayaan.nasabah[":id"].lokasi.$put({ param: { id }, json }))
    ).json(),
};
