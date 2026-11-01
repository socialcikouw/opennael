import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { rasioHariIni, useHariIni, useKalenderBulan, useTagihan } from "@/fitur/lapangan";
import { kueri } from "@/lib/api";
import { susunPerforma } from "./inti/performa";

/**
 * Bacaan Dasbor kolektor. Semuanya berawalan kunci `lapangan`, jadi tiap transaksi
 * lapangan (dan tarik-segarkan) menyegarkannya bersama: hari ini + daftar tagih
 * (rasio bayar, setoran), kalender bulan (hari tagih), performa harian sebulan,
 * dan portofolio pegangan.
 */
export function useDataDasbor() {
  const hariIni = useHariIni();
  const tagihan = useTagihan();
  const tanggal = hariIni.data?.kalender.tanggal;
  const bulan = tanggal?.slice(0, 7);
  const kalender = useKalenderBulan(bulan);
  const deret = useQuery(kueri.lapangan.performa(bulan ? `${bulan}-01` : undefined, tanggal));
  const portofolio = useQuery(kueri.lapangan.portofolio());

  const pinjaman = tagihan.data;
  const rasio = useMemo(
    () => (pinjaman && tanggal ? rasioHariIni(pinjaman, tanggal) : null),
    [pinjaman, tanggal],
  );
  const baris = deret.data;
  const hariTagih = kalender.data?.hariTagih;
  const performa = useMemo(
    () => (baris && tanggal ? susunPerforma(baris, hariTagih, tanggal) : null),
    [baris, hariTagih, tanggal],
  );
  return { hariIni, tagihan, deret, portofolio, rasio, performa };
}
