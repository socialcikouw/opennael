import { useMemo } from "react";
import { bacaGerbang, belumDicatat, useHariIni, useTagihan } from "@/fitur/lapangan";
import { jumlahTindakan, susunPengingat } from "./inti/pengingat";

/**
 * Pengingat kolektor dari bacaan lapangan yang SUDAH dimuat layar lain (hari ini
 * + daftar tagih — cache yang sama, tanpa permintaan tambahan). `pengingat` null
 * selama keadaan hari ini belum ada; `belum` = nama yang belum dicatat (null =
 * daftar tagih belum dimuat).
 */
export function usePengingat() {
  const hariIni = useHariIni();
  const tagihan = useTagihan();
  const keadaan = hariIni.data;
  const pinjaman = tagihan.data;
  const hasil = useMemo(() => {
    if (!keadaan) return { pengingat: null, belum: null };
    const belum = pinjaman
      ? belumDicatat(pinjaman, keadaan.kalender.tanggal).map((p) => p.nasabah.nama)
      : null;
    return { pengingat: susunPengingat({ gerbang: bacaGerbang(keadaan), belum }), belum };
  }, [keadaan, pinjaman]);
  return { hariIni, tagihan, ...hasil };
}

/** Angka di tab Notifikasi: pengingat yang menunggu tindakan kolektor. */
export function useJumlahPengingat(): number {
  const { pengingat } = usePengingat();
  return pengingat ? jumlahTindakan(pengingat) : 0;
}
