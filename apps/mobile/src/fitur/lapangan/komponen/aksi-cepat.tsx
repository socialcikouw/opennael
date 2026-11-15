import { Pressable, StyleSheet, Text, View } from "react-native";
import { bayangan } from "@/komponen/ui/bayangan";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/tema";

/**
 * AKSI CEPAT — kotak ketuk berikon di satu deret (Telepon · WhatsApp · Peta): satu ketukan
 * membuka aplikasinya. Lebar dibagi rata, jadi deret tetap rapi berapa pun yang tersedia.
 */
export function AksiCepat(props: {
  ikon: NamaIkon;
  label: string;
  /** Bacaan pembaca layar bila lebih panjang dari label (mis. memuat nomornya). */
  petunjuk?: string;
  onPress: () => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.petunjuk ?? props.label}
      style={({ pressed }) => [gaya.kotak, pressed ? gaya.ditekan : null]}
    >
      <View style={gaya.lingkar}>
        <Ikon nama={props.ikon} ukuran={20} warna={WARNA.utama} />
      </View>
      <Text style={gaya.label}>{props.label}</Text>
    </Pressable>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    kotak: {
      flex: 1,
      alignItems: "center",
      gap: RUANG[2],
      paddingVertical: RUANG[3],
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
      boxShadow: bayangan.kecil,
    },
    ditekan: { opacity: 0.7 },
    lingkar: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.utamaLembut,
    },
    label: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teksTombol },
  });
