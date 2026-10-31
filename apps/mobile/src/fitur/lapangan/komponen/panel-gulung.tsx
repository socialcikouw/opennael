import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import {
  BAYANGAN,
  HURUF,
  RUANG,
  SUDUT,
  TEBAL,
  type Warna,
  type WarnaMode,
} from "@/komponen/ui/tema";
import { PAPAN_POKOK } from "../inti/papan";
import { PapanTombol, tinggiTombolPapan } from "./papan-tombol";

/** Panel bawah layar Gulung: papan pokok dan tombol KONFIRMASI (aktif bila `sah`). */
export function PanelGulung({
  sah,
  memuat,
  aksen,
  onTekan,
  onKonfirmasi,
}: {
  sah: boolean;
  /** Sedang menyimpan: tombol mati dan berlabel "MENYIMPAN…". */
  memuat: boolean;
  aksen: WarnaMode;
  onTekan: (kunci: string) => void;
  onKonfirmasi: () => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const bawah = useSafeAreaInsets().bottom;
  const { height } = useWindowDimensions();

  return (
    <View style={[gaya.panel, { paddingBottom: bawah + RUANG[4] }]}>
      <PapanTombol
        papan={PAPAN_POKOK}
        tinggi={tinggiTombolPapan(height, PAPAN_POKOK.length, 600)}
        onTekan={onTekan}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !sah || memuat }}
        disabled={!sah || memuat}
        onPress={onKonfirmasi}
        style={({ pressed }) => [
          gaya.konfirmasi,
          sah ? { backgroundColor: aksen.isi } : gaya.konfirmasiMati,
          pressed ? gaya.konfirmasiDitekan : null,
        ]}
      >
        <Ikon
          nama={memuat ? "clock" : "check"}
          ukuran={20}
          warna={sah ? aksen.teksIsi : WARNA.samar}
          tebal
        />
        <Text style={[gaya.konfirmasiTeks, { color: sah ? aksen.teksIsi : WARNA.samar }]}>
          {memuat ? "MENYIMPAN…" : "KONFIRMASI"}
        </Text>
      </Pressable>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    panel: {
      gap: RUANG[4],
      paddingHorizontal: RUANG[4],
      paddingTop: RUANG[4],
      borderTopLeftRadius: SUDUT.lebar,
      borderTopRightRadius: SUDUT.lebar,
      backgroundColor: WARNA.permukaan,
      boxShadow: BAYANGAN.panelBawah,
    },
    konfirmasi: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[2],
      borderRadius: SUDUT.bulat,
    },
    konfirmasiMati: { backgroundColor: WARNA.abu },
    konfirmasiDitekan: { opacity: 0.88, transform: [{ scale: 0.98 }] },
    konfirmasiTeks: { ...HURUF.base, fontWeight: TEBAL.ekstra, letterSpacing: 1.5 },
  });
