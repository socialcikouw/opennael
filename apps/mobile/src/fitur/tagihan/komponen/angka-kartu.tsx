import { StyleSheet, Text, View } from "react-native";
import { HURUF, RUANG, TEBAL, WARNA } from "@/tema";
import type { KartuVM } from "../inti/kartu";

/**
 * Pokok Pinjaman (kiri, tenang) dan Sisa Saldo (kanan, besar dan tebal — angka yang
 * paling dicari kolektor). Angsuran hanya dicetak bila tak ada tombol Bayar — tombol
 * itu sudah mencetak nominalnya.
 */
export function AngkaKartu({ vm, tanpaAngsuran }: { vm: KartuVM; tanpaAngsuran: boolean }) {
  return (
    <View style={gaya.baris}>
      <Angka label="Pokok Pinjaman" nilai={vm.pokokRp} rata={gaya.kiri} />
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

const gaya = StyleSheet.create({
  baris: { flexDirection: "row", alignItems: "flex-end", gap: RUANG[2] },
  angka: { flex: 1, gap: 2 },
  label: { ...HURUF.xs, color: WARNA.redup },
  nilai: {
    ...HURUF.base,
    fontWeight: TEBAL.semi,
    color: WARNA.teksKedua,
    fontVariant: ["tabular-nums"],
  },
  // Sisa saldo: satu tingkat lebih besar dan paling terang di kartu.
  tegas: { ...HURUF.lg, fontWeight: TEBAL.ekstra, color: WARNA.teks },
  kiri: { textAlign: "left" },
  tengah: { textAlign: "center" },
  kanan: { textAlign: "right" },
});
