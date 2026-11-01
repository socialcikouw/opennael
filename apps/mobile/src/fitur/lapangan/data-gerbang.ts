import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { kueri } from "@/lib/api";
import { useHariIni, useTagihan } from "./data";
import { belumDicatat } from "./inti/belum-dicatat";
import { hitungGerbangMutasi } from "./inti/gerbang-mutasi";

/**
 * Hari kolektor ini dari sisi kas (rincian tunai seharusnya, laporan, serah
 * terima) — `undefined` = belum absen. Dipakai Mutasi, Notifikasi, dan gembok
 * tab Mutasi (satu cache, berawalan `lapangan`).
 */
export function useKasHariIni() {
  return useQuery({ ...kueri.lapangan.kas(), select: (hari) => hari[0] });
}

/**
 * Gerbang Mutasi kas (aturan-usaha C6) dari bacaan yang sudah dimuat layar
 * lain: keadaan hari ini, daftar tagih, dan hari kas. `belum` = yang wajib
 * ditagih hari ini tetapi belum dicatat (urut rute).
 */
export function useGerbangMutasi() {
  const hariIni = useHariIni();
  const tagihan = useTagihan();
  const kas = useKasHariIni();
  const keadaan = hariIni.data;
  const pinjaman = tagihan.data;
  const rincian = kas.data?.rincian;
  return useMemo(() => {
    const tanggal = keadaan?.kalender.tanggal;
    const belum = pinjaman && tanggal ? belumDicatat(pinjaman, tanggal) : [];
    // Semua dilunasi/digulung hari ini → daftar kosong, tapi ada uang yang harus dilaporkan.
    const adaCatatan = !!rincian && (rincian.storting !== 0 || rincian.droping > 0);
    const gerbang = hitungGerbangMutasi({
      hari: keadaan ? keadaan.hari : undefined,
      pinjaman: pinjaman && tanggal ? pinjaman.length : null,
      belum: belum.length,
      adaCatatan,
    });
    return { gerbang, belum };
  }, [keadaan, pinjaman, rincian]);
}
