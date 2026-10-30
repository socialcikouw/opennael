import { ScrollView, StyleSheet, View } from "react-native";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { Keterangan } from "@/komponen/ui/teks";
import { RUANG, SUDUT, type Warna } from "@/komponen/ui/tema";

/**
 * NOTIFIKASI — belum ada isinya: apa yang diberitahukan ke kolektor (dan
 * tabel/endpoint-nya) dirancang dulu di docs sebelum dibangun.
 */
export default function Notifikasi() {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const g = useG();
  const ruangTab = useRuangTab();
  return (
    <ScrollView style={g.layar} contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}>
      <View style={gaya.kosong}>
        <Ikon nama="bell" ukuran={28} warna={WARNA.redup} />
        <Keterangan>Belum ada notifikasi.</Keterangan>
      </View>
    </ScrollView>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
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
