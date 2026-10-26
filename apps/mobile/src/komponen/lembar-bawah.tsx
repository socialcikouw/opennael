import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGaya, useWarna } from "./tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "./tema";
import { Ikon } from "./ui";

/**
 * LEMBAR BAWAH — naik dari bawah di atas tirai gelap; ketuk tirai, tombol X,
 * atau tombol kembali Android untuk menutup. Isinya bergulir bila panjang dan
 * terdorong naik oleh keyboard. Satu rupa untuk semua lembar (Ganti Mode,
 * Setor, Bayar, Gulung, Lompat Rute).
 */
export function LembarBawah(props: {
  terbuka: boolean;
  onTutup: () => void;
  judul?: string;
  /** Dipanggil sesudah animasi tutup selesai (mis. menggulung daftar). */
  onSelesaiTutup?: () => void;
  children: ReactNode;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const bawah = useSafeAreaInsets().bottom;
  return (
    <Modal
      visible={props.terbuka}
      transparent
      animationType="slide"
      onRequestClose={props.onTutup}
      onDismiss={props.onSelesaiTutup}
      statusBarTranslucent
    >
      <Pressable style={gaya.tirai} onPress={props.onTutup} accessibilityLabel="Tutup" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[gaya.lembar, { paddingBottom: bawah + RUANG[4] }]}>
          <View style={gaya.pegangan} />
          {props.judul ? (
            <View style={gaya.kepala}>
              <Text style={gaya.judul}>{props.judul}</Text>
              <Pressable
                onPress={props.onTutup}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Tutup"
                style={gaya.tutup}
              >
                <Ikon nama="x" ukuran={18} warna={WARNA.teksKedua} />
              </Pressable>
            </View>
          ) : null}
          <ScrollView
            style={gaya.gulir}
            contentContainerStyle={gaya.isi}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {props.children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    tirai: { flex: 1, backgroundColor: WARNA.tiraiGelap },
    lembar: {
      maxHeight: "88%",
      paddingTop: RUANG[3],
      borderTopLeftRadius: SUDUT.lebar,
      borderTopRightRadius: SUDUT.lebar,
      backgroundColor: WARNA.permukaan,
    },
    pegangan: {
      alignSelf: "center",
      width: 40,
      height: 5,
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.garisTegas,
    },
    kepala: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: RUANG[5],
      paddingTop: RUANG[3],
    },
    judul: { ...HURUF.lg, flex: 1, fontWeight: TEBAL.tebal, color: WARNA.teks },
    tutup: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.abu,
    },
    gulir: { flexGrow: 0 },
    isi: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingTop: RUANG[4] },
  });
