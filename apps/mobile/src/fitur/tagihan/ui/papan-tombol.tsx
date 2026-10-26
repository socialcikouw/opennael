import { Pressable, StyleSheet, Text, View } from "react-native";
import { useGaya, useWarna } from "../../../komponen/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "../../../komponen/tema";
import { Ikon } from "../../../komponen/ui";
import { KOSONGKAN, MUNDUR, type Papan } from "../inti/papan";

/** Tinggi tombol papan menurut tinggi HP: 46–60 pt, papan selalu muat tanpa digulir. */
export function tinggiTombolPapan(tinggiLayar: number, jumlahBaris: number, sisa: number): number {
  return Math.round(Math.min(60, Math.max(46, (tinggiLayar - sisa) / jumlahBaris)));
}

/**
 * Papan tombol layar transaksi — baris-baris tombol bulat yang mengisi lebar
 * penuh (baris berisi dua tombol = dua tombol lebar, tanpa lubang). C
 * (kosongkan) berlatar merah lembut, ⌫ (mundur; tekan lama = kosongkan)
 * berlatar abu tua; isi lain berlatar abu lembut. Arti setiap tombol
 * ditentukan layar lewat `onTekan`.
 */
export function PapanTombol(props: {
  papan: Papan;
  tinggi: number;
  onTekan: (kunci: string) => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.papan}>
      {props.papan.map((baris) => (
        <View key={baris.join()} style={gaya.baris}>
          {baris.map((k) => {
            const kosongkan = k === KOSONGKAN;
            const mundur = k === MUNDUR;
            return (
              <Pressable
                key={k}
                accessibilityRole="button"
                accessibilityLabel={kosongkan ? "Kosongkan" : mundur ? "Hapus terakhir" : k}
                onPress={() => props.onTekan(k)}
                onLongPress={mundur ? () => props.onTekan(KOSONGKAN) : undefined}
                style={({ pressed }) => [
                  gaya.tombol,
                  { height: props.tinggi },
                  kosongkan ? gaya.kosongkan : mundur ? gaya.mundur : null,
                  pressed ? gaya.ditekan : null,
                ]}
              >
                {mundur ? (
                  <Ikon nama="delete" ukuran={24} warna={WARNA.teks} />
                ) : (
                  <Text
                    style={[gaya.label, kosongkan ? gaya.kosongkanTeks : null]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {k}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    papan: { gap: RUANG[2.5] },
    baris: { flexDirection: "row", gap: RUANG[2.5] },
    tombol: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: RUANG[2],
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.abu,
    },
    ditekan: { backgroundColor: WARNA.abuTua, transform: [{ scale: 0.96 }] },
    label: {
      ...HURUF["2xl"],
      fontWeight: TEBAL.semi,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    kosongkan: { backgroundColor: WARNA.bahayaLembut },
    kosongkanTeks: { ...HURUF.xl, fontWeight: TEBAL.tebal, color: WARNA.bahayaTeks },
    mundur: { backgroundColor: WARNA.abuTua },
  });
