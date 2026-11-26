import { StyleSheet, Text, View } from "react-native";
import { HURUF, TEBAL, WARNA } from "@/tema";

/**
 * Judul besar yang ikut tergulung (layar Rekap): overline kecil huruf besar (mis. periode
 * "JUMAT, 27 NOV 2026") + judul. Kepala navigasi tab disembunyikan untuk layar ini, jadi
 * yang dibaca mendapat seluruh layar.
 */
export function KepalaJudulBesar({ overline, judul }: { overline: string; judul: string }) {
  return (
    <View>
      <Text style={gaya.overline} numberOfLines={1}>
        {overline.toUpperCase()}
      </Text>
      <Text style={gaya.judul} accessibilityRole="header">
        {judul}
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
