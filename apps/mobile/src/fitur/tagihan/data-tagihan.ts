import { useMemo } from "react";
import {
  useHariIni,
  useKalenderBulan,
  usePeristiwaBulan,
  useRiwayatPinjaman,
  useTagihan,
} from "@/fitur/lapangan";
import { kemajuan, pilah, ringkasDroping, susunBaris, type TabKerja } from "./inti/daftar";
import { susunBahanGrid } from "./inti/grid";
import { kartuVM } from "./inti/kartu";
import { ringkasJatuhTempo } from "./inti/khusus";
import type { jenisDariMode, useMode } from "./mode";

/**
 * Bacaan lapangan layar Tagihan: hari ini (tanggal & gerbang), kartu pinjaman,
 * kalender bulan, peristiwa bulan, dan riwayat pinjaman mingguan.
 */
export function useDataTagihan(jenis: ReturnType<typeof jenisDariMode>) {
  const hariIni = useHariIni();
  const tanggal = hariIni.data?.kalender.tanggal;
  const tagihan = useTagihan();
  const kalender = useKalenderBulan(tanggal?.slice(0, 7));
  const peristiwa = usePeristiwaBulan(tanggal);
  const idMingguan = useMemo(
    () =>
      jenis === null || jenis === "mingguan"
        ? (tagihan.data ?? []).filter((p) => p.jenis === "mingguan").map((p) => p.id)
        : [],
    [tagihan.data, jenis],
  );
  const riwayat = useRiwayatPinjaman(idMingguan);
  return { hariIni, tanggal, tagihan, kalender, peristiwa, riwayat };
}

/** Turunan bacaan itu: bahan grid → kartu → segmen → baris, beserta ringkasannya. */
export function useDaftarTagihan({
  mode,
  jenis,
  tab,
  kunciCari,
  tanggal,
  tagihan,
  kalender,
  peristiwa,
  riwayat,
}: {
  mode: ReturnType<typeof useMode>;
  jenis: ReturnType<typeof jenisDariMode>;
  tab: TabKerja;
  kunciCari: string;
  tanggal: string | undefined;
  tagihan: ReturnType<typeof useTagihan>;
  kalender: ReturnType<typeof useKalenderBulan>;
  peristiwa: ReturnType<typeof usePeristiwaBulan>;
  riwayat: ReturnType<typeof useRiwayatPinjaman>;
}) {
  // ---- data → kartu → segmen → baris -------------------------------------
  const bahan = useMemo(
    () => (tanggal ? susunBahanGrid(tanggal, peristiwa.data, kalender.data, riwayat) : null),
    [tanggal, peristiwa.data, kalender.data, riwayat],
  );
  const semua = useMemo(() => {
    if (!tagihan.data || !tanggal || !bahan) return [];
    return tagihan.data
      .filter((p) => jenis === null || p.jenis === jenis)
      .map((p) => kartuVM(p, tanggal, bahan));
  }, [tagihan.data, tanggal, bahan, jenis]);
  const partisi = useMemo(() => pilah(semua, kunciCari), [semua, kunciCari]);
  const baris = useMemo(
    () => susunBaris(partisi[tab], tab === "droping" ? [] : partisi.sudah[tab]),
    [partisi, tab],
  );
  const maju = useMemo(() => kemajuan(semua), [semua]);
  const jatuhTempo = useMemo(
    () =>
      mode === "tempoan"
        ? ringkasJatuhTempo(semua.flatMap((vm) => (vm.tempo ? [vm.tempo] : [])))
        : null,
    [mode, semua],
  );
  const droping = useMemo(
    () => ringkasDroping(semua.filter((vm) => vm.ember === "droping")),
    [semua],
  );
  return { bahan, semua, partisi, baris, maju, jatuhTempo, droping };
}
