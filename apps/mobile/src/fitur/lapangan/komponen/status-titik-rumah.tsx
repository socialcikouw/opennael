import { Text, View } from "react-native";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { useWarna } from "@/komponen/ui/tampilan";
import type { TitikLatar } from "../titik-rumah-latar";

/**
 * Satu baris kecil di formulir akad: keadaan GPS di latar (lihat `useTitikRumahLatar`) —
 * mencari sinyal, titik sudah didapat, atau tak bisa. Hanya memberi tahu; tak pernah
 * menghalangi akad. `lama` = nasabah lama: titik hanya direkam bila ia belum punya.
 */
export function StatusTitikRumah({ titik, lama }: { titik: TitikLatar; lama: boolean }) {
  const g = useG();
  const WARNA = useWarna();
  const siap = titik.status === "siap";
  const teks =
    titik.status === "siap"
      ? `Titik rumah terdeteksi (±${titik.titik.akurasiMeter} m), ${
          lama ? "direkam bila nasabah belum punya" : "direkam otomatis saat akad disimpan"
        }.`
      : titik.status === "mencari"
        ? "Titik rumah: mencari sinyal GPS…"
        : `Titik rumah tidak terekam otomatis. ${titik.alasan}`;
  return (
    <View style={g.baris2} accessibilityLiveRegion="polite">
      <Ikon nama="map-pin" ukuran={14} warna={siap ? WARNA.utama : WARNA.redup} />
      <Text style={[g.teksRedup, g.isi]}>{teks}</Text>
    </View>
  );
}
