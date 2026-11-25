import type { ReactNode } from "react";
import { Modal, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useKeyboardContext } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

/**
 * LEMBAR BAWAH — naik (slide) dari bawah di atas tirai gelap; ketuk tirai, tombol X,
 * atau tombol kembali Android untuk menutup. Isinya bergulir bila panjang dan
 * terdorong naik oleh keyboard. Satu rupa untuk semua lembar (Ganti Mode, Alasan Libur).
 *
 * Menempel RAPAT ke tepi bawah layar, tata letaknya sengaja pasti (tak bergantung tinggi induk):
 * tirai menutup seluruh Modal (`absoluteFill`), lembar dipaku `bottom: 0`, tinggi maksimumnya
 * angka piksel dari ukuran layar, bantalan bawah = area aman HP. Papan ketik mendorong lembar
 * naik lewat `react-native-keyboard-controller` (transform, bukan `KeyboardAvoidingView` RN
 * yang menghitung posisi relatif — di Modal iOS menyisakan celah transparan di bawah lembar
 * dan memotong daftarnya, 26 Nov 2026).
 */
export function LembarBawah(props: {
  terbuka: boolean;
  onTutup: () => void;
  judul?: string;
  /** Dipanggil sesudah animasi tutup selesai (mis. menggulung daftar). */
  onSelesaiTutup?: () => void;
  children: ReactNode;
}) {
  // Area aman bawah saja; HP tanpa area aman (tombol navigasi) tetap diberi sedikit napas.
  const aman = useSafeAreaInsets();
  const bawah = Math.max(aman.bottom, RUANG[3]);
  const tinggiMaks = useWindowDimensions().height - aman.top - RUANG[6];
  // `height` papan ketik bernilai negatif saat terbuka; area aman bawah ikut tertutup papan.
  // Dibaca dari konteks `KeyboardProvider` langsung: hook `useReanimatedKeyboardAnimation` mengubah
  // mode papan ketik Android saat dipasang dan mengembalikannya saat dilepas (efek samping global).
  const papan = useKeyboardContext().reanimated.height;
  const naik = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.min(0, papan.value + bawah) }],
  }));
  return (
    <Modal
      visible={props.terbuka}
      transparent
      animationType="slide"
      onRequestClose={props.onTutup}
      onDismiss={props.onSelesaiTutup}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Tekan style={gaya.tirai} onPress={props.onTutup} accessibilityLabel="Tutup" />
      <Animated.View style={[gaya.lembar, { maxHeight: tinggiMaks, paddingBottom: bawah }, naik]}>
        <View style={gaya.pegangan} />
        {props.judul ? (
          <View style={gaya.kepala}>
            <Text style={gaya.judul}>{props.judul}</Text>
            <Tekan
              onPress={props.onTutup}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              style={gaya.tutup}
            >
              <Ikon nama="x" ukuran={18} warna={WARNA.teksKedua} />
            </Tekan>
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
      </Animated.View>
    </Modal>
  );
}

const gaya = StyleSheet.create({
  tirai: { ...StyleSheet.absoluteFill, backgroundColor: WARNA.tiraiGelap },
  lembar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: RUANG[3],
    borderTopLeftRadius: SUDUT.lebar,
    borderTopRightRadius: SUDUT.lebar,
    backgroundColor: WARNA.permukaanTinggi,
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
    backgroundColor: WARNA.isiNetralTegas,
  },
  gulir: { flexGrow: 0, flexShrink: 1 },
  isi: {
    gap: RUANG[4],
    paddingHorizontal: RUANG[5],
    paddingTop: RUANG[4],
    paddingBottom: RUANG[2],
  },
});
