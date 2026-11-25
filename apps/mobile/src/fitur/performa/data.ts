import type { JenisPinjaman } from "@opennael/domain";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { rasioJenis, useHariIni, useKalenderBulan, useTagihan } from "@/fitur/lapangan";
import { jatuhTempoDari } from "@/fitur/tagihan";
import { kueri } from "@/lib/api";
import { susunPerforma } from "./inti/performa";

/**
 * Bacaan layar PERFORMA (Mode Rekap) untuk saringan jenis (`null` = semua jenis): rasio bayar
 * hari ini dari pinjaman jenis itu, jatuh tempo tempoan, dan performa tagihan murni bulan ini
 * (aturan-usaha N: N1 harian, N3 mingguan & tempoan, N4 semua). Semua kueri berawalan kunci
 * `lapangan`, jadi tiap transaksi lapangan & tarik-segarkan menyegarkannya bersama;
 * performa berkunci per jenis, jadi pindah saringan memakai cache jenis itu sendiri.
 */
export function useDataPerforma(jenis: JenisPinjaman | null) {
  const hariIni = useHariIni();
  const tagihan = useTagihan();
  const tanggal = hariIni.data?.kalender.tanggal;
  const bulan = tanggal?.slice(0, 7);
  const kalender = useKalenderBulan(bulan);
  const deret = useQuery(
    kueri.lapangan.performa(bulan ? `${bulan}-01` : undefined, tanggal, jenis ?? "semua"),
  );

  const pinjaman = tagihan.data;
  const rasio = useMemo(
    () => (pinjaman && tanggal ? rasioJenis(pinjaman, tanggal, jenis) : null),
    [pinjaman, tanggal, jenis],
  );
  const jatuhTempo = useMemo(
    () => (jenis === "tempoan" && pinjaman && tanggal ? jatuhTempoDari(pinjaman, tanggal) : null),
    [jenis, pinjaman, tanggal],
  );
  const baris = deret.data;
  const hariTagih = kalender.data?.hariTagih;
  const performa = useMemo(
    () => (baris && tanggal ? susunPerforma(baris, hariTagih, tanggal) : null),
    [baris, hariTagih, tanggal],
  );
  return { hariIni, tagihan, deret, rasio, jatuhTempo, performa };
}
