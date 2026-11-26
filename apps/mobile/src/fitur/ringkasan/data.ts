import type { JenisPinjaman } from "@opennael/domain";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { kueri } from "@/lib/api";
import { useSesi } from "@/lib/sesi";
import type { Rentang } from "./inti/periode";

/**
 * Bacaan layar Ringkasan (Mode Rekap). Semuanya berawalan kunci `lapangan`, jadi ikut segar
 * sesudah tiap transaksi lapangan; catatan kasir (transfer, biaya, serah terima) masuk saat
 * layar ditarik atau aplikasi kembali dibuka. Hari kas kolektor (`useKasHariIni`) ada di
 * `@/fitur/lapangan` — dipakai juga gerbang Mutasi & Notifikasi.
 *
 * Ganti periode/jenis TIDAK mengosongkan layar: `keepPreviousData` menahan angka lama
 * (layar meredupkannya, `isPlaceholderData`) sampai yang baru tiba — kerangka hanya untuk
 * muatan pertama, jadi pil yang diketuk tak membuat layar berkedip lalu melompat.
 */

/** Angka kolektor ini satu rentang; `rentang` null = tak dibaca (mis. tanpa pembanding). */
export function useRingkasanPeriode(rentang: Rentang | null, jenis: JenisPinjaman | null) {
  return useQuery({
    ...kueri.lapangan.ringkasan(rentang?.mulai ?? "", rentang?.selesai ?? "", jenis ?? undefined),
    enabled: rentang !== null,
    placeholderData: keepPreviousData,
  });
}

/** Perkiraan gaji kolektor ini satu rentang (aturan-usaha J); `rentang` null = tak dibaca. */
export function useGajiPeriode(rentang: Rentang | null) {
  const kolektorId = useSesi()?.pengguna.id ?? "";
  return useQuery({
    ...kueri.lapangan.gaji(kolektorId, rentang?.mulai ?? "", rentang?.selesai ?? ""),
    enabled: rentang !== null && kolektorId !== "",
    placeholderData: keepPreviousData,
  });
}

/** Setoran berlaku kolektor ini hari ini (daftar Storting per nasabah). */
export function useSetoranHariIni() {
  return useQuery(kueri.lapangan.setoran());
}

/** Biaya tak terduga yang dicatat kasir untuk kolektor ini pada `tanggal` (kartu Operasional). */
export function useBiayaHariIni(tanggal: string | undefined) {
  return useQuery(kueri.lapangan.biaya(tanggal));
}
