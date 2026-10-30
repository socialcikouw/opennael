import { Text } from "react-native";
import { useGaya } from "@/komponen/ui/tampilan";
import type { Warna } from "@/komponen/ui/tema";
import { useG } from "./gaya-bersama";

const buatWarnaLencana = (WARNA: Warna) =>
  ({
    hijau: { backgroundColor: WARNA.utamaMuda, color: WARNA.utamaTua },
    kuning: { backgroundColor: WARNA.waspadaMuda, color: WARNA.waspadaTua },
    merah: { backgroundColor: WARNA.bahayaMuda, color: WARNA.bahayaTua },
    abu: { backgroundColor: WARNA.abu, color: WARNA.teksLabel },
  }) as const;

export function Lencana(props: {
  teks: string;
  warna?: keyof ReturnType<typeof buatWarnaLencana>;
}) {
  const g = useG();
  const warna = useGaya(buatWarnaLencana);
  return <Text style={[g.lencana, warna[props.warna ?? "abu"]]}>{props.teks}</Text>;
}
