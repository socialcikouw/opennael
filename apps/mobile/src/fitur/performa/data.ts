import type { JenisPinjaman } from "@opennael/domain";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { rasioJenis, useHariIni, useTagihan } from "@/fitur/lapangan";
import { jatuhTempoDari } from "@/fitur/tagihan";
import { kueri } from "@/lib/api";
import type { BulanPerforma } from "./inti/bulan";
import { type RingkasPerforma, susunPerforma } from "./inti/performa";

/**
 * Bacaan layar PERFORMA (Mode Rekap) untuk satu bulan & saringan jenis (`null` = semua
 * jenis): deret performa tagihan murni bulan itu (aturan-usaha N: N1 harian, N3 mingguan &
 * tempoan, N4 semua) disaring ke hari tagih kalender kantor; dan — untuk Bulan Ini — rasio
 * bayar hari ini & jatuh tempo tempoan. Semua kueri berawalan kunci `lapangan`, jadi tiap
 * transaksi lapangan & tarik-segarkan menyegarkannya bersama. Ganti bulan/jenis menahan
 * angka lama (`keepPreviousData`, layar meredupkannya) sampai yang baru tiba.
 */
export function useDataPerforma(bulan: BulanPerforma | null, jenis: JenisPinjaman | null) {
  const hariIni = useHariIni();
  const tagihan = useTagihan();
  const tanggal = hariIni.data?.kalender.tanggal;
  const kalender = useQuery({
    ...kueri.lapangan.kalender(bulan?.kunci),
    placeholderData: keepPreviousData,
  });
  const deret = useQuery({
    ...kueri.lapangan.performa(bulan?.mulai, bulan?.selesai, jenis ?? "semua"),
    placeholderData: keepPreviousData,
  });

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
  // Dihitung hanya bila deret & kalender milik bulan yang sama (bukan sisa bulan sebelumnya
  // yang ditahan); selama itu angka terakhir tetap tampil (diredupkan layar).
  const cocok = !deret.isPlaceholderData && !kalender.isPlaceholderData;
  const baru = useMemo(
    () =>
      baris && tanggal && hariTagih && cocok ? susunPerforma(baris, hariTagih, tanggal) : null,
    [baris, hariTagih, tanggal, cocok],
  );
  const terakhir = useRef<RingkasPerforma | null>(null);
  if (baru) terakhir.current = baru;
  const performa = baru ?? terakhir.current;
  return {
    hariIni,
    tagihan,
    kalender,
    deret,
    rasio,
    jatuhTempo,
    performa,
    /** Bulan/jenis baru sedang dimuat; yang tampil masih angka lama. */
    ganti: baru === null && performa !== null,
  };
}
