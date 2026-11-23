import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { KURVA } from "@/komponen/ui/gerak";
import { HURUF, RUANG, TEBAL, WARNA } from "@/tema";
import { MODE, type ModeApp, modeAktif } from "../mode";
import { pasangTirai, selesaiBeralih, usePermintaanMode } from "../transisi-mode";
import { HurufMode } from "./lembar-mode";

/** Layar menghitam. */
const MASUK_MS = 220;
/** Mode diganti sesudah layar tertutup penuh (sedikit sesudah `MASUK_MS`). */
const GANTI_MS = MASUK_MS + 40;
/** Layar mulai terbuka lagi — memberi waktu ±0,7 dtk tulisan & titik muat terbaca. */
const TUTUP_MS = 980;
/** Layar terbuka (memudar keluar). */
const KELUAR_MS = 260;

/**
 * TIRAI MODE — layar transisi saat beralih mode (permintaan pemilik 24 Nov 2026): layar
 * menghitam, muncul huruf mode + "Beralih ke / Mode Harian" + tiga titik muat yang melompat
 * bergantian, mode diganti DI BALIK tirai (pergantian tab & isi tak terlihat patah), lalu
 * tirai memudar dan mode baru tampil. Total ±1,2 dtk; menahan sentuhan selama tampil.
 * Pengumuman pembaca layar saat mode berganti (getar sudah diberikan tombol pemicunya, `Tekan`). Dipasang sekali di tata
 * letak tab kolektor; pemicu: `beralihMode` (bukan `modeAktif.ganti` langsung).
 */
export function TiraiMode() {
  const permintaan = usePermintaanMode();
  const [tampil, setTampil] = useState<{ mode: ModeApp; ke: number } | null>(null);

  useEffect(() => pasangTirai(), []);

  useEffect(() => {
    if (!permintaan) return;
    const { mode, lalu, ke } = permintaan;
    setTampil({ mode, ke });
    const ganti = setTimeout(() => {
      modeAktif.ganti(mode);
      lalu?.();
      AccessibilityInfo.announceForAccessibility(`Mode ${MODE[mode].label}`);
    }, GANTI_MS);
    const tutup = setTimeout(() => {
      setTampil(null);
      selesaiBeralih(ke);
    }, TUTUP_MS);
    return () => {
      clearTimeout(ganti);
      clearTimeout(tutup);
    };
  }, [permintaan]);

  if (!tampil) return null;
  return (
    <Animated.View
      key={tampil.ke}
      entering={FadeIn.duration(MASUK_MS).easing(KURVA.keluar)}
      exiting={FadeOut.duration(KELUAR_MS).easing(KURVA.keluar)}
      style={gaya.tirai}
      accessibilityViewIsModal
    >
      {/* Latar hitam: ikon jam & baterai terang selama tirai tampil. */}
      <StatusBar style="light" />
      <HurufMode mode={tampil.mode} ukuran={72} />
      <View style={gaya.teks}>
        <Text style={gaya.kecil}>Beralih ke</Text>
        <Text style={gaya.besar}>Mode {MODE[tampil.mode].label}</Text>
      </View>
      <TitikMuat />
    </Animated.View>
  );
}

/** Tiga titik muat yang melompat bergantian (gerak berulang di UI thread). */
function TitikMuat() {
  return (
    <View style={gaya.titikBaris} accessibilityLabel="Memuat">
      {[0, 1, 2].map((i) => (
        <Titik key={i} urutan={i} />
      ))}
    </View>
  );
}

function Titik({ urutan }: { urutan: number }) {
  const kurang = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    const naikTurun = withSequence(
      withTiming(1, { duration: 280, easing: KURVA.pindah }),
      withTiming(0, { duration: 280, easing: KURVA.pindah }),
    );
    v.set(withDelay(urutan * 140, withRepeat(naikTurun, -1)));
  }, [urutan, v]);
  // Pengurangan gerak: titik hanya berdenyut (opasitas), tak melompat.
  const gayaTitik = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * v.get(),
    transform: [{ translateY: kurang ? 0 : -8 * v.get() }],
  }));
  return <Animated.View style={[gaya.titik, gayaTitik]} />;
}

const gaya = StyleSheet.create({
  tirai: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: RUANG[5],
    backgroundColor: WARNA.latarTransisi,
  },
  teks: { alignItems: "center", gap: RUANG[1] },
  kecil: { ...HURUF.base, color: WARNA.teksTransisiRedup },
  besar: { ...HURUF["3xl"], fontWeight: TEBAL.ekstra, color: WARNA.teksTransisi },
  titikBaris: { flexDirection: "row", gap: RUANG[2], height: 24, alignItems: "flex-end" },
  titik: { width: 10, height: 10, borderRadius: 5, backgroundColor: WARNA.utamaIsi },
});
