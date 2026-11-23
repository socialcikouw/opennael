import { StyleSheet, Text, View } from "react-native";
import { HURUF, RUANG, TEBAL, WARNA } from "@/tema";
import type { KartuVM } from "../inti/kartu";

/**
 * Pokok Pinjaman (kiri, tenang) dan Sisa Saldo (kanan, besar dan tebal — angka yang
 * paling dicari kolektor). Angsuran hanya dicetak bila tak ada tombol Bayar — tombol
 * itu sudah mencetak nominalnya.
 */
export function AngkaKartu({ vm, tanpaAngsuran }: { vm: KartuVM; tanpaAngsuran: boolean }) {
  // Tiga kolom (kartu droping / baru tercatat) memakai huruf rapat supaya nominal jutaan
  // tak berhimpitan; dua kolom (kartu yang ditagih) tetap besar.
  const rapat = !tanpaAngsuran;
  return (
    <View style={[gaya.baris, rapat ? gaya.barisRapat : null]}>
      <Angka label="Pokok Pinjaman" nilai={vm.pokokRp} rata={gaya.kiri} rapat={rapat} />
      {rapat ? <Angka label="Angsuran" nilai={vm.angsuranRp} rata={gaya.tengah} rapat /> : null}
      <Angka label="Sisa Saldo" nilai={vm.saldoRp} rata={gaya.kanan} tegas rapat={rapat} />
    </View>
  );
}

function Angka(props: {
  label: string;
  nilai: string;
  rata: { textAlign: "left" | "center" | "right" };
  tegas?: boolean;
  rapat: boolean;
}) {
  const nilai = props.rapat
    ? [gaya.nilaiRapat, props.tegas ? gaya.tegasRapat : null]
    : [gaya.nilai, props.tegas ? gaya.tegas : null];
  return (
    <View style={gaya.angka}>
      <Text style={[props.rapat ? gaya.labelRapat : gaya.label, props.rata]} numberOfLines={1}>
        {props.label}
      </Text>
      <Text
        style={[...nilai, props.rata]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={props.rapat ? 0.75 : 0.8}
      >
        {props.nilai}
      </Text>
    </View>
  );
}

const gaya = StyleSheet.create({
  baris: { flexDirection: "row", alignItems: "flex-end", gap: RUANG[2] },
  barisRapat: { gap: RUANG[3] },
  angka: { flex: 1, minWidth: 0, gap: 2 },
  label: { ...HURUF.xs, color: WARNA.redup },
  nilai: {
    ...HURUF.base,
    fontWeight: TEBAL.semi,
    color: WARNA.teksKedua,
    fontVariant: ["tabular-nums"],
  },
  // Sisa saldo: satu tingkat lebih besar dan paling terang di kartu.
  tegas: { ...HURUF.lg, fontWeight: TEBAL.ekstra, color: WARNA.teks },
  // Tiga kolom: label 10 pt, nominal 12 pt, Sisa Saldo 14 pt tebal — terkecil yang masih
  // terbaca di luar ruangan.
  labelRapat: { ...HURUF["3xs"], color: WARNA.redup },
  nilaiRapat: {
    ...HURUF.xs,
    fontWeight: TEBAL.semi,
    color: WARNA.teksKedua,
    fontVariant: ["tabular-nums"],
  },
  tegasRapat: { ...HURUF.sm, fontWeight: TEBAL.ekstra, color: WARNA.teks },
  kiri: { textAlign: "left" },
  tengah: { textAlign: "center" },
  kanan: { textAlign: "right" },
});
