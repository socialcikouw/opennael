import { Alert } from "react-native";
import { tulis, useTulis } from "@/fitur/lapangan";
import { PesanGalat } from "@/komponen/ui/isian";
import { Tombol } from "@/komponen/ui/tombol";

/**
 * Buka laporan — hanya ditawarkan bila semua yang wajib ditagih hari ini sudah
 * dicatat (C6; server juga menolaknya). Sesudah dibuka, catatan lapangan hari ini
 * ditutup, jadi konfirmasinya tetap ditanyakan.
 */
export function AksiLaporan() {
  const laporan = useTulis(tulis.laporan);

  const bukaLaporan = () =>
    Alert.alert(
      "Buka laporan?",
      "Sesudah laporan dibuka, setoran, akad, gulung, dan libur hari ini tidak bisa dicatat lagi.",
      [
        { text: "Batal", style: "cancel" },
        { text: "Buka laporan", style: "destructive", onPress: () => laporan.mutate() },
      ],
    );

  return (
    <>
      <PesanGalat pesan={laporan.error?.message} />
      <Tombol
        judul="Buka laporan hari ini"
        ikon="file-text"
        memuat={laporan.isPending}
        onPress={bukaLaporan}
      />
    </>
  );
}
