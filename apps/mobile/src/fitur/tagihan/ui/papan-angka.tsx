import { Pressable, StyleSheet, Text, View } from "react-native";
import { useGaya, useWarna } from "../../../komponen/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "../../../komponen/tema";
import { Ikon } from "../../../komponen/ui";
import { BARIS_PAPAN, type TombolPapan } from "../inti/papan";

/**
 * Papan angka: 1–9 dan 0 · 00 · 000 dalam tiga kolom tombol bulat, lalu satu
 * baris fungsi selebar papan — C (kosongkan) dan ⌫ (hapus satu; tekan lama =
 * kosongkan) sama besar, jadi tak ada lubang di lajur. `tinggi` dihitung
 * layar dari tinggi HP supaya papan selalu muat tanpa digulir.
 */
export function PapanAngka(props: {
  tinggi: number;
  onKetik: (tombol: TombolPapan) => void;
  onHapus: () => void;
  onKosongkan: () => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const tinggi = { height: props.tinggi };
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
              style={({ pressed }) => [gaya.tombol, tinggi, pressed ? gaya.ditekan : null]}
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
          style={({ pressed }) => [
            gaya.tombol,
            gaya.kosongkan,
            tinggi,
            pressed ? gaya.ditekan : null,
          ]}
        >
          <Text style={gaya.kosongkanTeks}>C</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hapus satu angka"
          onPress={props.onHapus}
          onLongPress={props.onKosongkan}
          style={({ pressed }) => [gaya.tombol, gaya.hapus, tinggi, pressed ? gaya.ditekan : null]}
        >
          <Ikon nama="delete" ukuran={24} warna={WARNA.teks} />
        </Pressable>
      </View>
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
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.abu,
    },
    ditekan: { backgroundColor: WARNA.abuTua, transform: [{ scale: 0.96 }] },
    angka: {
      ...HURUF["2xl"],
      fontWeight: TEBAL.semi,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    kosongkan: { backgroundColor: WARNA.bahayaLembut },
    kosongkanTeks: { ...HURUF.xl, fontWeight: TEBAL.tebal, color: WARNA.bahayaTeks },
    hapus: { backgroundColor: WARNA.abuTua },
  });
