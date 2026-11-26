import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { HURUF, RUANG, TEBAL, WARNA } from "@/tema";
import type { SelisihVM } from "./komposisi";

/**
 * Naik/turun terhadap periode pembanding sepadan: "▲ 12% dari Oktober 1–27". Naik hijau,
 * turun merah, sama redup. `sorot` = di atas kartu pekat (teks terang, panah berwarna arti).
 */
export function TandaSelisih({ vm, sorot = false }: { vm: SelisihVM; sorot?: boolean }) {
  const warna =
    vm.arah === "naik" ? WARNA.sukses : vm.arah === "turun" ? WARNA.bahaya : WARNA.redup;
  return (
    <View style={gaya.baris}>
      {vm.arah === "tetap" ? null : (
        <Ikon
          nama={vm.arah === "naik" ? "trending-up" : "trending-down"}
          ukuran={14}
          warna={sorot ? WARNA.teksSorot : warna}
        />
      )}
      <Text style={[gaya.teks, { color: sorot ? WARNA.teksSorotRedup : warna }]} numberOfLines={1}>
        {vm.teks}
      </Text>
    </View>
  );
}

const gaya = StyleSheet.create({
  baris: { flexDirection: "row", alignItems: "center", gap: RUANG[1] },
  teks: { ...HURUF.xs, fontWeight: TEBAL.semi, flexShrink: 1 },
});
