import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, panggil } from "./api";

/**
 * DATA LAPANGAN KOLEKTOR — kueri bersama layar kerja harian, kartu pinjaman,
 * akad, dan gulung. Setiap tulisan menyegarkan semua kueri `lapangan`.
 */
const KUNCI = ["lapangan"] as const;

export function useHariIni() {
  return useQuery({
    queryKey: [...KUNCI, "hari-ini"],
    queryFn: async () => (await panggil(() => api.lapangan["hari-ini"].$get())).json(),
  });
}

export function useTagihan() {
  return useQuery({
    queryKey: [...KUNCI, "pinjaman"],
    queryFn: async () => (await panggil(() => api.lapangan.pinjaman.$get())).json(),
  });
}

/**
 * Posisi tagih (aturan-usaha B5: angsuran tertinggal & tunggakan) pinjaman
 * aktif pegangan kolektor ini, per id pinjaman — dari `GET /pinjaman` yang
 * sudah menghitungnya untuk kolektor. Dimuat sejajar dengan daftar tagih:
 * kartu tampil dulu, penanda telat menyusul.
 */
export function usePosisiTagih() {
  return useQuery({
    queryKey: [...KUNCI, "posisi-tagih"],
    queryFn: async () => {
      const kartu = await (
        await panggil(() => api.pinjaman.$get({ query: { status: "aktif" } }))
      ).json();
      return new Map(kartu.map((k) => [k.id, k.tagih]));
    },
  });
}

export function useKampung() {
  return useQuery({
    queryKey: [...KUNCI, "kampung"],
    queryFn: async () => (await panggil(() => api.lapangan.kampung.$get())).json(),
  });
}

export function useNasabahLama() {
  return useQuery({
    queryKey: [...KUNCI, "nasabah-lama"],
    queryFn: async () => (await panggil(() => api.lapangan["nasabah-lama"].$get())).json(),
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
  absen: async (json: Parameters<typeof api.lapangan.absen.$post>[0]["json"]) =>
    (await panggil(() => api.lapangan.absen.$post({ json }))).json(),
  laporan: async () => (await panggil(() => api.lapangan.laporan.$post())).json(),
  akad: async (json: Parameters<typeof api.lapangan.akad.$post>[0]["json"]) =>
    (await panggil(() => api.lapangan.akad.$post({ json }))).json(),
  bayar: async (json: Parameters<typeof api.lapangan.bayar.$post>[0]["json"]) =>
    (await panggil(() => api.lapangan.bayar.$post({ json }))).json(),
  lunas: async (pinjamanId: string) =>
    (await panggil(() => api.lapangan.lunas.$post({ json: { pinjamanId } }))).json(),
  gulung: async (json: Parameters<typeof api.lapangan.gulung.$post>[0]["json"]) =>
    (await panggil(() => api.lapangan.gulung.$post({ json }))).json(),
  libur: async (json: Parameters<typeof api.lapangan.libur.$post>[0]["json"]) =>
    (await panggil(() => api.lapangan.libur.$post({ json }))).json(),
};

type KeadaanHariIni = NonNullable<ReturnType<typeof useHariIni>["data"]>;

/**
 * Gerbang lapangan (C4) dibaca di HP — hanya untuk menjelaskan & menonaktifkan
 * tombol lebih awal; server tetap yang memutuskan.
 */
export function bacaGerbang(k: KeadaanHariIni): {
  buka: boolean;
  /** Belum absen: tampilkan formulir absen. */
  perluAbsen: boolean;
  judul?: string;
  isi?: string;
} {
  const { kalender, hari } = k;
  if (kalender.liburKantor) {
    return { buka: false, perluAbsen: false, judul: "Libur kantor", isi: kalender.liburKantor };
  }
  if (!kalender.hariKerja) {
    return {
      buka: false,
      perluAbsen: false,
      judul: "Bukan hari kerja",
      isi: "Lapangan tutup hari ini.",
    };
  }
  if (!hari) {
    return kalender.dalamJamKerja
      ? { buka: false, perluAbsen: true }
      : {
          buka: false,
          perluAbsen: false,
          judul: "Di luar jam kerja",
          isi: "Absen & catatan lapangan dibuka pada jam kerja kantor.",
        };
  }
  if (hari.absensi === "tidak_kerja") {
    return {
      buka: false,
      perluAbsen: false,
      judul: "Anda tidak kerja hari ini",
      isi: hari.alasanTidakKerja ?? undefined,
    };
  }
  if (hari.laporanDibukaAt) {
    return {
      buka: false,
      perluAbsen: false,
      judul: "Laporan sudah dibuka",
      isi: "Catatan lapangan hari ini sudah ditutup.",
    };
  }
  if (!kalender.dalamJamKerja) {
    return {
      buka: false,
      perluAbsen: false,
      judul: "Di luar jam kerja",
      isi: "Catatan lapangan dibuka pada jam kerja kantor.",
    };
  }
  return { buka: true, perluAbsen: false };
}
