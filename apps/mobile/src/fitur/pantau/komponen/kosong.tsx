import { StyleSheet, Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";

/** Kotak kosong bergaris putus — daftar tab pantau yang belum berisi. */
export function KotakKosong(props: { ikon: NamaIkon; judul: string; isi: string }) {
  const gaya = useGaya(buatGaya);
  const WARNA = useWarna();
  return (
    <View style={gaya.kosong}>
      <Ikon nama={props.ikon} ukuran={28} warna={WARNA.redup} />
      <Text style={gaya.judul}>{props.judul}</Text>
      <Text style={gaya.isi}>{props.isi}</Text>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    kosong: {
      alignItems: "center",
      gap: RUANG[2],
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: WARNA.garisTegas,
      paddingHorizontal: RUANG[4],
      paddingVertical: RUANG[8],
    },
    judul: { ...HURUF.base, fontWeight: TEBAL.tebal, color: WARNA.teks },
    isi: { ...HURUF.sm, textAlign: "center", color: WARNA.redup },
  });
