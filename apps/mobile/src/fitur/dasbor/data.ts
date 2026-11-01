import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { rasioMode, useHariIni, useKalenderBulan, useTagihan } from "@/fitur/lapangan";
import { jatuhTempoDari, jenisDariMode, useMode } from "@/fitur/tagihan";
import { kueri } from "@/lib/api";
import { susunPerforma } from "./inti/performa";
import { portofolioUntuk } from "./inti/portofolio";

/**
 * Bacaan Dasbor kolektor — SEMUANYA mengikuti mode aktif (Harian · Mingguan ·
 * Tempoan · Semua): rasio bayar dari pinjaman jenis itu, performa tagihan murni
 * menurut jenis (aturan-usaha N), portofolio jenis itu, dan di Tempoan jatuh
 * tempo sebagai ganti rasio. Semua kueri berawalan kunci `lapangan`, jadi tiap
 * transaksi lapangan dan tarik-segarkan menyegarkannya bersama; performa
 * berkunci per jenis, jadi pindah mode memakai cache jenis itu sendiri.
 */
export function useDataDasbor() {
  const mode = useMode();
  const jenis = jenisDariMode(mode);
  const hariIni = useHariIni();
  const tagihan = useTagihan();
  const tanggal = hariIni.data?.kalender.tanggal;
  const bulan = tanggal?.slice(0, 7);
  const kalender = useKalenderBulan(bulan);
  const deret = useQuery(
    kueri.lapangan.performa(bulan ? `${bulan}-01` : undefined, tanggal, jenis ?? "semua"),
  );
  const portofolioSemua = useQuery(kueri.lapangan.portofolio());

  const pinjaman = tagihan.data;
  const rasio = useMemo(
    () => (pinjaman && tanggal ? rasioMode(pinjaman, tanggal, jenis) : null),
    [pinjaman, tanggal, jenis],
  );
  const jatuhTempo = useMemo(
    () => (mode === "tempoan" && pinjaman && tanggal ? jatuhTempoDari(pinjaman, tanggal) : null),
    [mode, pinjaman, tanggal],
  );
  const baris = deret.data;
  const hariTagih = kalender.data?.hariTagih;
  const performa = useMemo(
    () => (baris && tanggal ? susunPerforma(baris, hariTagih, tanggal) : null),
    [baris, hariTagih, tanggal],
  );
  const dataPortofolio = portofolioSemua.data;
  const portofolio = useMemo(
    () => (dataPortofolio ? portofolioUntuk(dataPortofolio, jenis) : undefined),
    [dataPortofolio, jenis],
  );
  return {
    mode,
    hariIni,
    tagihan,
    deret,
    portofolioSemua,
    portofolio,
    rasio,
    jatuhTempo,
    performa,
  };
}
