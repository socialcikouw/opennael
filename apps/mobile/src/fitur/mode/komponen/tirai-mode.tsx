import { router } from "expo-router";
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
import { MODE, type Mode } from "../mode";
import { pasangPengarah, selesaiBeralih, usePermintaanMode } from "../transisi-mode";
import { HurufMode } from "./huruf-mode";

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
 * menghitam, muncul huruf mode + "Beralih ke / Mode Rekap" + tiga titik muat yang melompat
 * bergantian, grup rute mode diganti DI BALIK tirai (pergantian tab & isi tak terlihat
 * patah), lalu tirai memudar dan mode baru tampil. Total ±1,2 dtk; menahan sentuhan selama
 * tampil. Pengumuman pembaca layar saat mode berganti (getar sudah diberikan tombol
 * pemicunya, `Tekan`).
 *
 * Dipasang sekali di `app/kolektor/_layout.tsx` (di atas semua grup mode) dan memasang
 * PENGARAH untuk `beralihMode`: pindah dalam mode = `router.navigate`; ganti mode = tutup
 * layar bertumpuk (`dismissAll`) lalu `router.replace` grup mode tujuan.
 */
export function TiraiMode() {
  const permintaan = usePermintaanMode();
  const [tampil, setTampil] = useState<{ mode: Mode; nomor: number } | null>(null);

  useEffect(
    () =>
      pasangPengarah({
        // Rute tujuan berasal dari `MODE[…].awal` & rute tab yang ditulis di kode (bukan masukan).
        pindah: (ke) => router.navigate(ke as never),
        gantiMode: (ke) => {
          if (router.canDismiss()) router.dismissAll();
          router.replace(ke as never);
        },
      }),
    [],
  );

  useEffect(() => {
    if (!permintaan) return;
    const { mode, ke, nomor } = permintaan;
    setTampil({ mode, nomor });
    const ganti = setTimeout(() => {
      if (router.canDismiss()) router.dismissAll();
      router.replace(ke as never);
      AccessibilityInfo.announceForAccessibility(`Mode ${MODE[mode].label}`);
    }, GANTI_MS);
    const tutup = setTimeout(() => {
      setTampil(null);
      selesaiBeralih(nomor);
    }, TUTUP_MS);
    return () => {
      clearTimeout(ganti);
      clearTimeout(tutup);
    };
  }, [permintaan]);

  if (!tampil) return null;
  return (
    <Animated.View
      key={tampil.nomor}
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
