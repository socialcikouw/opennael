import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";
import type { FotoSerahTerima } from "./kamera-serah-terima";

/**
 * Foto serah terima di layar Gulung: pratinjau dengan jam & sisa berlaku 1 jam,
 * atau ajakan memotret bila belum ada. `fotoSah` = foto belum lewat 1 jam.
 */
export function FotoGulung({
  foto,
  fotoSah,
  aksen,
  onPotret,
}: {
  foto: FotoSerahTerima | null;
  fotoSah: boolean;
  aksen: WarnaMode;
  onPotret: () => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const { height } = useWindowDimensions();

  if (!foto) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPotret}
        style={({ pressed }) => [gaya.fotoKosong, pressed ? gaya.ditekan : null]}
      >
        <Ikon nama="camera" ukuran={20} warna={aksen.teks} />
        <Text style={[gaya.fotoKosongTeks, { color: aksen.teks }]}>Potret serah terima</Text>
      </Pressable>
    );
  }
  return (
    <View style={[gaya.foto, { height: Math.round(Math.min(160, Math.max(96, height * 0.15))) }]}>
      <Image source={{ uri: foto.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={gaya.fotoKaki}>
        <View style={[gaya.fotoChip, fotoSah ? null : gaya.fotoChipLewat]}>
          <Ikon nama="clock" ukuran={12} warna={WARNA.putih} />
          <Text style={gaya.fotoChipTeks}>
            {fotoSah
              ? `${new Date(foto.diambilAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })} · berlaku 1 jam`
              : "Lewat 1 jam"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Potret ulang foto serah terima"
          onPress={onPotret}
          hitSlop={6}
          style={({ pressed }) => [gaya.fotoChip, pressed ? gaya.ditekan : null]}
        >
          <Ikon nama="camera" ukuran={12} warna={WARNA.putih} />
          <Text style={gaya.fotoChipTeks}>Potret ulang</Text>
        </Pressable>
      </View>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    foto: {
      overflow: "hidden",
      justifyContent: "flex-end",
      borderRadius: SUDUT.besar,
      backgroundColor: WARNA.abu,
    },
    fotoKaki: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: RUANG[2],
    },
    fotoChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[1],
      paddingHorizontal: RUANG[2.5],
      paddingVertical: RUANG[1],
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.tiraiGelap,
    },
    fotoChipLewat: { backgroundColor: WARNA.bahaya },
    fotoChipTeks: { ...HURUF.xs, fontWeight: TEBAL.semi, color: WARNA.putih },
    fotoKosong: {
      height: 72,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[2],
      borderRadius: SUDUT.besar,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: WARNA.garisTegas,
    },
    fotoKosongTeks: { ...HURUF.sm, fontWeight: TEBAL.tebal },
    ditekan: { opacity: 0.8 },
  });
