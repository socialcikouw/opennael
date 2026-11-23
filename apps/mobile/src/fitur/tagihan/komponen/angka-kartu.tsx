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
      <Text style={[gaya.label, props.rata]} numberOfLines={1}>
        {props.label}
      </Text>
      <Text
        style={[gaya.nilai, props.tegas ? gaya.tegas : null, props.rata]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {props.nilai}
      </Text>
    </View>
  );
}

/**
 * Huruf rapat untuk SEMUA kartu (droping, berjalan, macet; permintaan pemilik 24 Nov 2026):
 * label 10 pt, nominal 12 pt, Sisa Saldo 14 pt tebal — terkecil yang masih terbaca di luar
 * ruangan. Tiap kolom tak bisa melebar ke kolom lain; nominal panjang mengecil sendiri.
 */
const gaya = StyleSheet.create({
  baris: { flexDirection: "row", alignItems: "flex-end", gap: RUANG[3] },
  angka: { flex: 1, minWidth: 0, gap: 2 },
  label: { ...HURUF["3xs"], color: WARNA.redup },
  nilai: {
    ...HURUF.xs,
    fontWeight: TEBAL.semi,
    color: WARNA.teksKedua,
    fontVariant: ["tabular-nums"],
  },
  tegas: { ...HURUF.sm, fontWeight: TEBAL.ekstra, color: WARNA.teks },
  kiri: { textAlign: "left" },
  tengah: { textAlign: "center" },
  kanan: { textAlign: "right" },
});
