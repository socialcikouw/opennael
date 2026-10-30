import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { HURUF } from "@/komponen/ui/tema";
import { useG } from "./gaya-bersama";

/** Tanda merek: kotak hijau ber-"N" + nama aplikasi. */
export function Merek({ besar }: { besar?: boolean }) {
  const g = useG();
  return (
    <View style={g.baris3}>
      <View style={[g.merekKotak, besar ? g.merekKotakBesar : null]}>
        <Text style={[g.merekHuruf, besar ? HURUF["2xl"] : HURUF.lg]}>N</Text>
      </View>
      <View>
        <Text style={[g.merekNama, besar ? HURUF.xl : HURUF.base]}>OpenNael</Text>
        <Text style={g.teksMini}>Simpan pinjam harian</Text>
      </View>
    </View>
  );
}

export function Judul({ children }: { children: ReactNode }) {
  const g = useG();
  return <Text style={g.judul}>{children}</Text>;
}

export function Keterangan({ children }: { children: ReactNode }) {
  const g = useG();
  return <Text style={g.keterangan}>{children}</Text>;
}
