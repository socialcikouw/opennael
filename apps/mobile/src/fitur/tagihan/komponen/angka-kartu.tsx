import { StyleSheet, Text, View } from "react-native";
import { useGaya } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, TEBAL, type Warna } from "@/komponen/ui/tema";
import type { KartuVM } from "../inti/kartu";

/**
 * Pokok (kiri) dan Sisa Saldo (kanan). Angsuran hanya dicetak bila tak ada
 * tombol Bayar — tombol itu sudah mencetak nominalnya.
 */
export function AngkaKartu({ vm, tanpaAngsuran }: { vm: KartuVM; tanpaAngsuran: boolean }) {
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.baris}>
      <Angka label="Pokok" nilai={vm.pokokRp} rata={gaya.kiri} />
      {tanpaAngsuran ? null : <Angka label="Angsuran" nilai={vm.angsuranRp} rata={gaya.tengah} />}
      <Angka label="Sisa Saldo" nilai={vm.saldoRp} rata={gaya.kanan} tegas />
    </View>
  );
}

function Angka(props: {
  label: string;
  nilai: string;
  rata: { textAlign: "left" | "center" | "right" };
  tegas?: boolean;
}) {
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.angka}>
      <Text style={[gaya.label, props.rata]}>{props.label}</Text>
      <Text
        style={[gaya.nilai, props.tegas ? gaya.tegas : null, props.rata]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {props.nilai}
      </Text>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    baris: { flexDirection: "row", gap: RUANG[2] },
    angka: { flex: 1, gap: 2 },
    label: { ...HURUF.xs, color: WARNA.redup },
    nilai: {
      ...HURUF.base,
      fontWeight: TEBAL.semi,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    tegas: { fontWeight: TEBAL.ekstra },
    kiri: { textAlign: "left" },
    tengah: { textAlign: "center" },
    kanan: { textAlign: "right" },
  });
