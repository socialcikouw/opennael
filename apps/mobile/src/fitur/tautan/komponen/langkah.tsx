import { Text, View } from "react-native";
import { useG } from "@/komponen/ui/gaya-bersama";
import { useGaya } from "@/komponen/ui/tampilan";
import { buatGaya } from "../gaya";

const LANGKAH = [
  "Bos membuka web OpenNael → menu Tautkan HP.",
  "Bos memindai QR di bawah, atau mengetik kodenya.",
  "HP ini masuk sendiri begitu disetujui.",
];

export function Langkah() {
  const gaya = useGaya(buatGaya);
  const g = useG();
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
