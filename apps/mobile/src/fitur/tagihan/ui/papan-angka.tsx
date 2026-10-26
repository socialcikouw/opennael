import { Pressable, StyleSheet, Text, View } from "react-native";
import { useGaya, useWarna } from "../../../komponen/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "../../../komponen/tema";
import { Ikon } from "../../../komponen/ui";
import { BARIS_PAPAN, type TombolPapan } from "../inti/papan";

/** Tinggi satu tombol papan — cukup untuk jempol, tetap muat di HP layar kecil. */
const TINGGI_TOMBOL = 52;

/**
 * Papan angka 3 kolom: 1–9, lalu 0 · 00 · 000, lalu C (kosongkan) dan ⌫
 * (hapus satu digit; tekan lama = kosongkan) di kolom tepi. Semua tombol
 * satu ukuran, jadi lajurnya lurus.
 */
export function PapanAngka(props: {
  onKetik: (tombol: TombolPapan) => void;
  onHapus: () => void;
  onKosongkan: () => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.papan}>
      {BARIS_PAPAN.map((baris) => (
        <View key={baris.join()} style={gaya.baris}>
          {baris.map((t) => (
            <Pressable
              key={t}
              accessibilityRole="button"
              accessibilityLabel={t}
              onPress={() => props.onKetik(t)}
              style={({ pressed }) => [gaya.tombol, pressed ? gaya.ditekan : null]}
            >
              <Text style={gaya.angka}>{t}</Text>
            </Pressable>
          ))}
        </View>
      ))}
      <View style={gaya.baris}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kosongkan"
          onPress={props.onKosongkan}
          style={({ pressed }) => [gaya.tombol, gaya.fungsi, pressed ? gaya.ditekan : null]}
        >
          <Text style={[gaya.angka, { color: WARNA.bahayaTeks }]}>C</Text>
        </Pressable>
        <View style={gaya.kosong} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hapus satu angka"
          onPress={props.onHapus}
          onLongPress={props.onKosongkan}
          style={({ pressed }) => [gaya.tombol, gaya.fungsi, pressed ? gaya.ditekan : null]}
        >
          <Ikon nama="delete" ukuran={24} warna={WARNA.teks} />
        </Pressable>
      </View>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    papan: { gap: RUANG[2] },
    baris: { flexDirection: "row", gap: RUANG[2] },
    tombol: {
      flex: 1,
      height: TINGGI_TOMBOL,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.sedang,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    fungsi: { borderColor: WARNA.abu, backgroundColor: WARNA.abu },
    ditekan: { borderColor: WARNA.abuTua, backgroundColor: WARNA.abuTua },
    kosong: { flex: 1 },
    angka: {
      ...HURUF["2xl"],
      fontWeight: TEBAL.semi,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
  });
