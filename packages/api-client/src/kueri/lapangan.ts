import type { JenisPerforma } from "@opennael/contracts";
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
      /**
       * Portofolio pegangan kolektor (jumlah & saldo berjalan, macet, diputihkan) — kartu
       * Dasbor. Berawalan `lapangan`, jadi ikut segar sesudah tiap transaksi lapangan.
       */
      portofolio: () =>
        queryOptions({
          queryKey: [...kunci.lapangan, "portofolio"],
          queryFn: () => ambil(() => api.pembiayaan.lapangan.portofolio.$get()),
        }),
      /**
       * Performa penagihan harian kolektor ini (aturan-usaha N) untuk rentang tanggal,
       * menurut `jenis` (harian · mingguan · tempoan · semua) — Dasbor mengikuti mode.
       * Server membatasi kolektor ke dirinya; berawalan `lapangan` agar ikut segar.
       */
      performa: (mulai: string | undefined, sampai: string | undefined, jenis: JenisPerforma) =>
        queryOptions({
          queryKey: [...kunci.lapangan, "performa", jenis, mulai, sampai],
          queryFn: () =>
            ambil(() =>
              api.pelaporan.ringkasan.performa.$get({
                query: { mulai: mulai ?? "", selesai: sampai ?? "", jenis },
              }),
            ),
          enabled: !!mulai && !!sampai,
        }),
      /**
       * Hari kolektor ini sendiri dari sisi kas (rincian tunai seharusnya, laporan, serah
       * terima) — tab Mutasi. Server hanya memberi kolektor miliknya, dengan rincian.
       */
      kas: () =>
        queryOptions({
          queryKey: [...kunci.lapangan, "kas"],
          queryFn: () => ambil(() => api.hariKolektor["hari-kolektor"].$get({ query: {} })),
        }),
      /** Setoran berlaku kolektor ini hari ini (beserta transfernya) — tab Storting. */
      setoran: () =>
        queryOptions({
          queryKey: [...kunci.lapangan, "setoran"],
          queryFn: () => ambil(() => api.hariKolektor.transaksi.$get({ query: {} })),
        }),
      /** Biaya tak terduga kolektor ini pada `tanggal` (dicatat kasir) — tab Mutasi. */
      biaya: (tanggal: string | undefined) =>
        queryOptions({
          queryKey: [...kunci.lapangan, "biaya", tanggal],
          queryFn: () =>
            ambil(() =>
              api.hariKolektor["biaya-tak-terduga"].$get({
                query: { tanggalMulai: tanggal, tanggalSelesai: tanggal },
              }),
            ),
          enabled: tanggal !== undefined,
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
