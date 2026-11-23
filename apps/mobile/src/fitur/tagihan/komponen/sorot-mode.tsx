import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import Animated, { FadeOut, withTiming } from "react-native-reanimated";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { DURASI, KURVA } from "@/komponen/ui/gerak";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { MODE, type ModeApp, useMode } from "../mode";
import { HurufMode } from "./lembar-mode";

/** Lama kartu tampil sebelum menghilang sendiri. */
const TAMPIL_MS = 1100;

/**
 * Kartu muncul dari arah tombol mode (naik sedikit + membesar dari 0,95), ease-out 240 ms.
 * Asal transformasi kiri-bawah: kartu seolah tumbuh dari tombol huruf mode di pojok kiri.
 */
function masuk() {
  "worklet";
  const kurva = { duration: DURASI.sedang, easing: KURVA.keluar };
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 12 }, { scale: 0.95 }] },
    animations: {
      opacity: withTiming(1, kurva),
      transform: [{ translateY: withTiming(0, kurva) }, { scale: withTiming(1, kurva) }],
    },
  };
}

/**
 * SOROT MODE — tanda singkat bahwa mode BERGANTI: kartu "(L) Mode Laporan" muncul di atas
 * tombol mode lalu menghilang sendiri, disertai satu getar halus. Dibutuhkan karena semua
 * mode berwarna sama (terakota): tanpa ini, pergantian hanya terbaca dari huruf kecil di
 * tombol dan susunan tab. Menanggapi pergantian dari mana pun (lembar Ganti Mode, tombol
 * "Tagih di mode …" di Notifikasi); tak tampil saat aplikasi dibuka. Tak menangkap sentuhan.
 */
export function SorotMode() {
  const mode = useMode();
  // Tepat di atas tab bar mengambang (ruang yang sama dengan yang disisakan layar ber-tab).
  const bawah = useRuangTab();
  const sebelumnya = useRef(mode);
  const [sorot, setSorot] = useState<{ mode: ModeApp; ke: number } | null>(null);

  useEffect(() => {
    if (sebelumnya.current === mode) return;
    sebelumnya.current = mode;
    // Getar di saat yang sama dengan kartu muncul — satu per pergantian.
    void Haptics.selectionAsync().catch(() => undefined);
    AccessibilityInfo.announceForAccessibility(`Mode ${MODE[mode].label}`);
    // `ke` naik tiap pergantian: berganti mode cepat dua kali tetap memutar animasi masuk lagi.
    setSorot((s) => ({ mode, ke: (s?.ke ?? 0) + 1 }));
    const t = setTimeout(() => setSorot(null), TAMPIL_MS);
    return () => clearTimeout(t);
  }, [mode]);

  return (
    <View pointerEvents="none" style={[gaya.wadah, { bottom: bawah }]}>
      {sorot ? (
        <Animated.View
          key={sorot.ke}
          entering={masuk}
          exiting={FadeOut.duration(DURASI.keluar)}
          style={gaya.kartu}
        >
          <HurufMode mode={sorot.mode} ukuran={44} />
          <View style={gaya.teks}>
            <Text style={gaya.label}>Mode {MODE[sorot.mode].label}</Text>
            <Text style={gaya.keterangan} numberOfLines={1}>
              {MODE[sorot.mode].keterangan}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const gaya = StyleSheet.create({
  wadah: { position: "absolute", left: RUANG[3], right: RUANG[3], alignItems: "flex-start" },
  kartu: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[3],
    paddingVertical: RUANG[3],
    paddingLeft: RUANG[3],
    paddingRight: RUANG[5],
    borderRadius: SUDUT.lebar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaanTinggi,
    transformOrigin: "left bottom",
  },
  teks: { flexShrink: 1, gap: RUANG[0.5] },
  label: { ...HURUF.lg, fontWeight: TEBAL.ekstra, color: WARNA.teks },
  keterangan: { ...HURUF.xs, color: WARNA.redup },
});
