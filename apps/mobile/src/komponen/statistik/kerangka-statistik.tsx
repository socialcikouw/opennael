import { type DimensionValue, StyleSheet, View } from "react-native";
import { RUANG, SUDUT, WARNA } from "@/tema";

/**
 * Kerangka muatan PERTAMA layar Rekap — kartu sorot lalu `kartu` kartu rincian berkeping 2×2,
 * bentuknya sama dengan susunan nyata supaya layar tak melompat saat data tiba. Balok diam:
 * ganti periode/jenis tak memakainya (angka lama ditahan & diredupkan).
 */
/** Kunci tetap balok kartu (paling banyak empat). */
const KUNCI_KARTU = ["a", "b", "c", "d"] as const;

export function KerangkaStatistik({ kartu = 2 }: { kartu?: number }) {
  return (
    <View style={gaya.isi} accessibilityLabel="Memuat">
      <View style={[gaya.kartu, gaya.sorot]}>
        <Balok lebar={110} tinggi={14} gelap />
        <Balok lebar={200} tinggi={30} gelap />
        <View style={gaya.deret}>
          <View style={[gaya.keping, gaya.balokGelap]} />
          <View style={[gaya.keping, gaya.balokGelap]} />
        </View>
      </View>
      {KUNCI_KARTU.slice(0, kartu).map((k) => (
        <View key={k} style={[gaya.kartu, gaya.putih]}>
          <Balok lebar={120} tinggi={14} />
          <Balok lebar={170} tinggi={24} />
          <View style={gaya.deret}>
            <View style={[gaya.keping, gaya.balok]} />
            <View style={[gaya.keping, gaya.balok]} />
          </View>
          <View style={gaya.deret}>
            <View style={[gaya.keping, gaya.balok]} />
            <View style={[gaya.keping, gaya.balok]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function Balok({
  lebar,
  tinggi,
  gelap,
}: {
  lebar: DimensionValue;
  tinggi: number;
  gelap?: boolean;
}) {
  return <View style={[gelap ? gaya.balokGelap : gaya.balok, { width: lebar, height: tinggi }]} />;
}

const gaya = StyleSheet.create({
  isi: { gap: RUANG[3] },
  kartu: { gap: RUANG[3], padding: RUANG[4], borderRadius: SUDUT.besar + 2 },
  sorot: { borderRadius: SUDUT.lebar, backgroundColor: WARNA.isiNetralTegas },
  putih: { borderWidth: 1, borderColor: WARNA.garis, backgroundColor: WARNA.permukaan },
  balok: { borderRadius: SUDUT.kecil, backgroundColor: WARNA.isiNetral },
  balokGelap: { borderRadius: SUDUT.kecil, backgroundColor: WARNA.permukaan, opacity: 0.6 },
  deret: { flexDirection: "row", gap: RUANG[2] },
  keping: { flex: 1, height: 48, borderRadius: SUDUT.sedang },
});
