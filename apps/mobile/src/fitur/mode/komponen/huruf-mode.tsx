import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeOut, LayoutAnimationConfig, withTiming } from "react-native-reanimated";
import { DURASI, KURVA } from "@/komponen/ui/gerak";
import { AKSEN, HURUF, TEBAL } from "@/tema";
import { MODE, type Mode } from "../mode";

/** Huruf baru meluncur naik ke tempatnya (ease-out); huruf lama memudar cepat. */
function hurufMasuk() {
  "worklet";
  const kurva = { duration: DURASI.kecil, easing: KURVA.keluar };
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 10 }] },
    animations: {
      opacity: withTiming(1, kurva),
      transform: [{ translateY: withTiming(0, kurva) }],
    },
  };
}

/**
 * Huruf mode di lingkaran berwarna mode — (K) (R) (A). Isi tombol kiri batang tab.
 * `bergerak`: huruf berganti dengan gerak saat mode berganti (tombol tab bar); tanpa gerak
 * di daftar lembar Ganti Mode dan saat pertama tampil.
 */
export function HurufMode({
  mode,
  ukuran = 36,
  bergerak = false,
}: {
  mode: Mode;
  ukuran?: number;
  bergerak?: boolean;
}) {
  const w = AKSEN;
  const huruf = <Text style={[gaya.huruf, { color: w.teksIsi }]}>{MODE[mode].huruf}</Text>;
  return (
    <View
      style={[
        gaya.lingkaran,
        { width: ukuran, height: ukuran, borderRadius: ukuran / 2, backgroundColor: w.isi },
      ]}
    >
      {bergerak ? (
        // Huruf lama & baru sempat tampil bersamaan: keduanya ditumpuk (absolut), tak berbaris.
        <LayoutAnimationConfig skipEntering>
          <Animated.View
            key={mode}
            entering={hurufMasuk}
            exiting={FadeOut.duration(DURASI.keluar)}
            style={gaya.tumpuk}
          >
            {huruf}
          </Animated.View>
        </LayoutAnimationConfig>
      ) : (
        huruf
      )}
    </View>
  );
}

const gaya = StyleSheet.create({
  lingkaran: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  tumpuk: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  huruf: { ...HURUF.lg, fontWeight: TEBAL.ekstra, includeFontPadding: false },
});
