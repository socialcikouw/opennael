import { ScrollView, StyleSheet, View } from "react-native";
import { useRuangTab } from "../../../komponen/tab-mengambang";
import { RUANG, SUDUT } from "../../../komponen/tema";
import { g, Ikon, Keterangan, WARNA } from "../../../komponen/ui";

/**
 * NOTIFIKASI — belum ada isinya: apa yang diberitahukan ke kolektor (dan
 * tabel/endpoint-nya) dirancang dulu di docs sebelum dibangun.
 */
export default function Notifikasi() {
  const ruangTab = useRuangTab();
  return (
    <ScrollView style={g.layar} contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}>
      <View style={gaya.kosong}>
        <Ikon nama="notifications-outline" ukuran={28} warna={WARNA.redup} />
        <Keterangan>Belum ada notifikasi.</Keterangan>
      </View>
    </ScrollView>
  );
}

const gaya = StyleSheet.create({
  isi: { paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
  kosong: {
    alignItems: "center",
    gap: RUANG[2],
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: WARNA.garisTegas,
    paddingHorizontal: RUANG[4],
    paddingVertical: RUANG[8],
  },
});
