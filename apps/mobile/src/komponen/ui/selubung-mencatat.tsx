import { useEffect } from "react";
import { ActivityIndicator, BackHandler, StyleSheet, Text } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { DURASI } from "./gerak";

/**
 * SELUBUNG MENCATAT — penanda "sedang menyimpan" yang sama untuk semua transaksi:
 * lapisan kertas tembus pandang + putaran + tulisan, menutup (dan menahan sentuhan pada)
 * yang ada di bawahnya. Dipakai kartu Tagihan (Libur, Lunasi) dan layar Bayar & Gulung
 * (permintaan pemilik 24 Nov 2026: proses simpan harus kelihatan, bukan hanya tombol
 * berganti "MENYIMPAN…").
 *
 * - `layar` = menutup satu layar penuh: putaran & tulisan lebih besar, dan tombol kembali
 *   Android ditahan selama tampil (formulir tak tertutup di tengah penyimpanan).
 * - Tanpa `layar` = menutup satu kotak (kartu), sudutnya mengikuti kartu.
 */
export function SelubungMencatat({
  judul = "Mencatat…",
  warna,
  layar = false,
}: {
  judul?: string;
  /** Warna putaran & tulisan (warna mode); bawaan warna utama. */
  warna?: string;
  layar?: boolean;
}) {
  const w = warna ?? WARNA.utama;

  useEffect(() => {
    if (!layar) return;
    const tahan = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => tahan.remove();
  }, [layar]);

  return (
    <Animated.View
      entering={FadeIn.duration(DURASI.kecil)}
      style={[gaya.selubung, layar ? gaya.penuh : gaya.kotak]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={judul}
    >
      <ActivityIndicator color={w} size={layar ? "large" : "small"} />
      <Text style={[layar ? gaya.judulBesar : gaya.judul, { color: w }]}>{judul}</Text>
    </Animated.View>
  );
}

const gaya = StyleSheet.create({
  selubung: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.tiraiSibuk,
  },
  kotak: { gap: RUANG[2], borderRadius: SUDUT.besar },
  penuh: { gap: RUANG[3], zIndex: 10 },
  judul: { ...HURUF.sm, fontWeight: TEBAL.semi },
  judulBesar: { ...HURUF.lg, fontWeight: TEBAL.tebal },
});
