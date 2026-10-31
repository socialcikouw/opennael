import { queryOptions } from "@tanstack/react-query";
import type { Bahan } from "../bahan";
import { kunci } from "../kunci";

/**
 * Kueri HP kolektor (layar kerja harian, kartu pinjaman, akad, gulung). Semua
 * kuncinya berawalan `kunci.lapangan`, jadi satu `invalidateQueries` sesudah
 * tulisan lapangan menyegarkan semuanya. Kampung di sini sengaja terpisah dari
 * `kueri.kampung` milik web: cache-nya mengikuti awalan alur ini.
 */
export function kueriLapangan({ api, ambil }: Bahan) {
  return {
    lapangan: {
      /** Absen, laporan, dan gerbang kalender kolektor hari ini. */
      hariIni: () =>
        queryOptions({
          queryKey: [...kunci.lapangan, "hari-ini"],
          queryFn: () => ambil(() => api.hariKolektor.lapangan["hari-ini"].$get()),
        }),
      /** Kartu pinjaman pegangan kolektor. */
      tagihan: () =>
        queryOptions({
          queryKey: [...kunci.lapangan, "pinjaman"],
          queryFn: () => ambil(() => api.pembiayaan.lapangan.pinjaman.$get()),
        }),
      /** Kalender kantor sebulan (`YYYY-MM`): hari tagih & libur kantor — bahan grid kartu. */
      kalender: (bulan: string | undefined) =>
        queryOptions({
          queryKey: [...kunci.lapangan, "kalender", bulan],
          queryFn: () =>
            ambil(() => api.kantor.lapangan.kalender.$get({ query: { bulan: bulan ?? "" } })),
          enabled: !!bulan,
          staleTime: 60 * 60 * 1000,
        }),
      /** Peristiwa pegangan kolektor dari awal bulan s/d `hariIni` — isi grid setoran sebulan. */
      peristiwaBulan: (hariIni: string | undefined) => {
        const awal = hariIni ? `${hariIni.slice(0, 7)}-01` : "";
        return queryOptions({
          queryKey: [...kunci.lapangan, "peristiwa-bulan", hariIni],
          queryFn: () =>
            ambil(() =>
              api.pembiayaan.transaksi.peristiwa.$get({
                query: { tanggalMulai: awal, tanggalSelesai: hariIni ?? "" },
              }),
            ),
          enabled: !!hariIni,
        });
      },
      /** Seluruh riwayat satu pinjaman (kotak mingguan sepanjang tenor bisa melewati sebulan). */
      riwayatPinjaman: (pinjamanId: string) =>
        queryOptions({
          queryKey: [...kunci.lapangan, "peristiwa-pinjaman", pinjamanId],
          queryFn: () =>
            ambil(() => api.pembiayaan.transaksi.peristiwa.$get({ query: { pinjamanId } })),
        }),
      kampung: () =>
        queryOptions({
          queryKey: [...kunci.lapangan, "kampung"],
          queryFn: () => ambil(() => api.kantor.lapangan.kampung.$get()),
        }),
      nasabahLama: () =>
        queryOptions({
          queryKey: [...kunci.lapangan, "nasabah-lama"],
          queryFn: () => ambil(() => api.pembiayaan.lapangan["nasabah-lama"].$get()),
        }),
    },
  };
}
