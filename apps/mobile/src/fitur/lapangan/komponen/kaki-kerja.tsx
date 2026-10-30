import { router } from "expo-router";
import { Alert, View } from "react-native";
import { TombolKeluar } from "@/fitur/akun";
import { PilihTampilan } from "@/komponen/pilih-tampilan";
import { PesanGalat } from "@/komponen/ui/isian";
import { Spanduk } from "@/komponen/ui/spanduk";
import { useGaya } from "@/komponen/ui/tampilan";
import { Tombol } from "@/komponen/ui/tombol";
import { tulis, useTulis } from "../data";
import { buatGaya } from "../gaya-beranda";

/**
 * Buka laporan — hanya bila semua yang wajib ditagih hari ini sudah dicatat
 * (C6; server juga menolaknya). `sisa` = nama yang belum; null = memuat.
 */
export function KakiKerja({ laporanBisa, sisa }: { laporanBisa: boolean; sisa: string[] | null }) {
  const gaya = useGaya(buatGaya);
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
    <View style={gaya.kaki}>
      {laporanBisa ? (
        <>
          {sisa && sisa.length > 0 ? (
            <Spanduk
              judul={`Masih ${sisa.length} nasabah belum dicatat`}
              isi={`${sisa.slice(0, 3).join(", ")}${sisa.length > 3 ? ", …" : ""} — catat setoran atau libur dulu, baru laporan bisa dibuka.`}
            />
          ) : null}
          <PesanGalat pesan={laporan.error?.message} />
          {sisa && sisa.length > 0 ? (
            <Tombol
              judul={`Lihat yang belum (${sisa.length})`}
              ikon="users"
              onPress={() => router.navigate("/kolektor/tagihan")}
            />
          ) : null}
          <Tombol
            judul="Buka laporan hari ini"
            jenis="kedua"
            ikon="file-text"
            memuat={laporan.isPending}
            nonaktif={sisa === null || sisa.length > 0}
            onPress={bukaLaporan}
          />
        </>
      ) : null}
      <PilihTampilan />
      <TombolKeluar />
    </View>
  );
}
