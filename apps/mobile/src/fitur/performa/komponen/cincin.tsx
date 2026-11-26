import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { WARNA } from "@/tema";

/**
 * Cincin persentase (SVG): rel `isiNetralTegas`, busur `warna` sepanjang `isi` (0–1, lebih
 * dari 1 tetap penuh). Isi tengah = `children`. Dimulai dari atas, searah jarum jam.
 */
export function Cincin(props: {
  isi: number;
  ukuran: number;
  tebal: number;
  warna: string;
  children?: ReactNode;
}) {
  const { ukuran, tebal } = props;
  const r = (ukuran - tebal) / 2;
  const keliling = 2 * Math.PI * r;
  const isi = Math.max(0, Math.min(1, props.isi));
  return (
    <View style={{ width: ukuran, height: ukuran }}>
      <Svg width={ukuran} height={ukuran} style={gaya.putar}>
        <Circle
          cx={ukuran / 2}
          cy={ukuran / 2}
          r={r}
          stroke={WARNA.isiNetralTegas}
          strokeWidth={tebal}
          fill="none"
        />
        {isi > 0 ? (
          <Circle
            cx={ukuran / 2}
            cy={ukuran / 2}
            r={r}
            stroke={props.warna}
            strokeWidth={tebal}
            strokeLinecap="round"
            strokeDasharray={keliling}
            strokeDashoffset={keliling * (1 - isi)}
            fill="none"
          />
        ) : null}
      </Svg>
      <View style={gaya.tengah}>{props.children}</View>
    </View>
  );
}

const gaya = StyleSheet.create({
  putar: { transform: [{ rotate: "-90deg" }] },
  tengah: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
