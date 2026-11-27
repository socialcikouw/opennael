import { useQuery } from "@tanstack/react-query";
import { useHariIni } from "@/fitur/lapangan";
import { kueri } from "@/lib/api";
import { useSesi } from "@/lib/sesi";
import { mulaiGajiBerjalan } from "./inti/gaji";

/**
 * Bacaan GAJI kolektor ini: riwayat slip (`GET /kas/gaji`, kolektor hanya miliknya) dan gaji
 * yang belum dibayar — pratinjau server sejak sehari sesudah slip berlaku terakhir sampai
 * hari ini (`GET /kas/gaji/pratinjau`, di bawah kunci `lapangan` jadi ikut segar sesudah
 * tiap transaksi). Slip ditulis bos dari web: masuk saat layar ditarik atau dibuka ulang.
 */
export function useGajiBerjalan() {
  const kolektorId = useSesi()?.pengguna.id ?? "";
  const hariIni = useHariIni();
  const tanggal = hariIni.data?.kalender.tanggal;
  const slip = useQuery({ ...kueri.gaji.slip(kolektorId), enabled: kolektorId !== "" });
  const mulai = tanggal && slip.data ? mulaiGajiBerjalan(slip.data, tanggal) : null;
  const pratinjau = useQuery({
    ...kueri.lapangan.gaji(kolektorId, mulai ?? "", tanggal ?? ""),
    enabled: kolektorId !== "" && mulai !== null && !!tanggal,
  });
  return { hariIni, tanggal, slip, mulai, pratinjau };
}
