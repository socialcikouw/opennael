import { StyleSheet, Text, View } from "react-native";
import { HURUF, TEBAL, WARNA } from "@/tema";

/**
 * Judul besar yang ikut tergulung: overline periode (huruf besar kecil, mis. "JUMAT, 27 NOV
 * 2026") + "Ringkasan". Kepala navigasi tab disembunyikan untuk layar ini, jadi yang
 * dibaca mendapat seluruh layar.
 */
export function KepalaRingkasan({ periode }: { periode: string }) {
  return (
    <View>
      <Text style={gaya.overline} numberOfLines={1}>
        {periode.toUpperCase()}
      </Text>
      <Text style={gaya.judul} accessibilityRole="header">
        Ringkasan
      </Text>
    </View>
  );
}

const gaya = StyleSheet.create({
  overline: { ...HURUF["2xs"], fontWeight: TEBAL.tebal, letterSpacing: 0.8, color: WARNA.redup },
  judul: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: TEBAL.ekstra,
    letterSpacing: -0.8,
    color: WARNA.teks,
  },
});
