import { StyleSheet, Text, View } from "react-native";
import { g } from "@/komponen/ui/gaya-bersama";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

const LANGKAH = [
  "Bos membuka web OpenNael → menu Tautkan HP.",
  "Bos memindai QR di bawah, atau mengetik kodenya.",
  "HP ini masuk sendiri begitu disetujui.",
];

export function Langkah() {
  return (
    <View style={g.tumpuk3}>
      {LANGKAH.map((teks, i) => (
        <View key={teks} style={[g.baris3, gaya.langkah]}>
          <View style={gaya.nomor}>
            <Text style={gaya.nomorTeks}>{i + 1}</Text>
          </View>
          <Text style={gaya.langkahTeks}>{teks}</Text>
        </View>
      ))}
    </View>
  );
}

const gaya = StyleSheet.create({
  langkah: { alignItems: "flex-start" },
  nomor: {
    width: 28,
    height: 28,
    borderRadius: SUDUT.bulat,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.utamaMuda,
  },
  nomorTeks: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.utamaTua },
  langkahTeks: { ...HURUF.base, flex: 1, paddingTop: RUANG[0.5], color: WARNA.teksLabel },
});
