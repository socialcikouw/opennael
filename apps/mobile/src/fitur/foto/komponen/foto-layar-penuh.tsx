import { tampilKampung, tampilNama, tanggalBertahun } from "@opennael/format";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { FlatList, Modal, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sumberFoto } from "@/fitur/lapangan";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import type { FotoBerfoto } from "../inti/kelompok-foto";

/**
 * FOTO LAYAR PENUH — foto-foto SATU kampung, digeser kiri/kanan (satu halaman per foto),
 * dibuka di foto yang diketuk. Pita bawah: nama, kampung · tanggal akad, dan posisi
 * ("2 dari 6"). Latar hitam, ikon status bar terang.
 */
export function FotoLayarPenuh(props: {
  foto: readonly FotoBerfoto[] | null;
  awal: number;
  onTutup: () => void;
}) {
  const { width: lebar } = useWindowDimensions();
  const { top: atas, bottom: bawah } = useSafeAreaInsets();
  const [indeks, setIndeks] = useState(props.awal);
  const daftar = props.foto ?? [];
  const kini = daftar[indeks] ?? daftar[0];

  return (
    <Modal
      visible={props.foto !== null}
      animationType="fade"
      onRequestClose={props.onTutup}
      onShow={() => setIndeks(props.awal)}
      statusBarTranslucent
    >
      <StatusBar style="light" />
      <View style={gaya.layar}>
        <FlatList
          data={daftar}
          keyExtractor={(f) => f.nasabahId}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={props.awal}
          getItemLayout={(_, i) => ({ length: lebar, offset: lebar * i, index: i })}
          onMomentumScrollEnd={(e) => setIndeks(Math.round(e.nativeEvent.contentOffset.x / lebar))}
          renderItem={({ item }) => (
            <Image
              source={sumberFoto(item.fotoId)}
              cachePolicy="disk"
              contentFit="contain"
              style={{ width: lebar, height: "100%" }}
              accessibilityLabel={`Foto serah terima ${item.nama}`}
            />
          )}
        />
        <Tekan
          onPress={props.onTutup}
          accessibilityRole="button"
          accessibilityLabel="Tutup"
          hitSlop={8}
          style={[gaya.tutup, { top: atas + RUANG[3] }]}
        >
          <Ikon nama="x" ukuran={24} warna={WARNA.diAtasFoto} />
        </Tekan>
        {kini ? (
          <View style={[gaya.pita, { paddingBottom: bawah + RUANG[4] }]}>
            <Text style={gaya.nama} numberOfLines={1}>
              {tampilNama(kini.nama)}
            </Text>
            <Text style={gaya.ket} numberOfLines={1}>
              {tampilKampung(kini.kampung)} · akad {tanggalBertahun(kini.tanggalAkad)}
            </Text>
            <Text style={gaya.ket}>
              {indeks + 1} dari {daftar.length}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const gaya = StyleSheet.create({
  layar: { flex: 1, backgroundColor: WARNA.latarMedia },
  tutup: {
    position: "absolute",
    right: RUANG[4],
    padding: RUANG[2],
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.tiraiTerang,
  },
  pita: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    gap: 2,
    paddingTop: RUANG[4],
    paddingHorizontal: RUANG[5],
    backgroundColor: WARNA.tiraiGelap,
  },
  nama: { ...HURUF.lg, fontWeight: TEBAL.tebal, color: WARNA.diAtasFoto },
  ket: { ...HURUF.xs, color: WARNA.diAtasFoto },
});
