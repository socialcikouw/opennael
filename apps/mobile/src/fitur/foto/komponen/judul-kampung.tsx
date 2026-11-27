import { tampilKampung } from "@opennael/format";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LEBAR_REL, TEBAL_REL, TENGAH_REL } from "@/komponen/rel-kartu";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

/** Tinggi kotak jumlah; rel turun dari bawahnya. */
const TINGGI_JUMLAH = 24;
const ATAS_JUDUL = RUANG[3];

/**
 * Judul kampung di tab Foto — rupa judul kelompok tab Harian: kotak jumlah nasabah, nama
 * kampung huruf besar, dan rel yang turun ke kartu-kartu foto di bawahnya.
 *   [2] PULE
 *    |
 */
export const JudulKampung = memo(function JudulKampung(props: { kampung: string; jumlah: number }) {
  return (
    <View
      style={gaya.judul}
      accessibilityRole="header"
      accessibilityLabel={`${tampilKampung(props.kampung)}, ${props.jumlah} nasabah`}
    >
      <View style={gaya.jumlah}>
        <Text style={gaya.jumlahTeks}>{props.jumlah}</Text>
      </View>
      <Text style={gaya.nama} numberOfLines={1}>
        {tampilKampung(props.kampung)}
      </Text>
      <View pointerEvents="none" style={gaya.rel} />
    </View>
  );
});

const gaya = StyleSheet.create({
  judul: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[2],
    paddingTop: ATAS_JUDUL,
    paddingBottom: RUANG[2],
  },
  // Lebar 30 (garis tengah di 15) = garis tengah rel kartu di bawahnya.
  jumlah: {
    width: LEBAR_REL - RUANG[2],
    height: TINGGI_JUMLAH,
    borderRadius: SUDUT.kecil,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: WARNA.garisTegas,
    backgroundColor: WARNA.isiNetral,
  },
  jumlahTeks: {
    ...HURUF.xs,
    fontWeight: TEBAL.tebal,
    color: WARNA.teksKedua,
    fontVariant: ["tabular-nums"],
  },
  nama: {
    ...HURUF.sm,
    flex: 1,
    fontWeight: TEBAL.tebal,
    letterSpacing: 0.5,
    color: WARNA.teks,
  },
  rel: {
    position: "absolute",
    top: ATAS_JUDUL + TINGGI_JUMLAH,
    bottom: 0,
    left: TENGAH_REL - TEBAL_REL / 2,
    width: TEBAL_REL,
    backgroundColor: WARNA.garisTegas,
  },
});
