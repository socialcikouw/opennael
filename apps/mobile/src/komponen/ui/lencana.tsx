import { Text } from "react-native";
import { WARNA } from "@/tema";
import { g } from "./gaya-bersama";

const WARNA_LENCANA = {
  hijau: { backgroundColor: WARNA.suksesMuda, color: WARNA.suksesTua },
  kuning: { backgroundColor: WARNA.waspadaMuda, color: WARNA.waspadaTua },
  merah: { backgroundColor: WARNA.bahayaMuda, color: WARNA.bahayaTua },
  abu: { backgroundColor: WARNA.isiNetral, color: WARNA.teksLabel },
} as const;

export function Lencana(props: { teks: string; warna?: keyof typeof WARNA_LENCANA }) {
  return <Text style={[g.lencana, WARNA_LENCANA[props.warna ?? "abu"]]}>{props.teks}</Text>;
}
