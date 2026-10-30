import { router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useState } from "react";
import { Alert } from "react-native";
import { HurufMode, LembarMode } from "@/fitur/mode/lembar-mode";
import { jenisDariMode, MODE, useMode } from "@/fitur/mode/mode";
import { TabMengambang } from "@/komponen/tab-mengambang";
import { useWarna, useWarnaMode } from "@/komponen/ui/tampilan";
import { TEBAL } from "@/komponen/ui/tema";
import { bacaGerbang, useHariIni } from "@/lib/lapangan";

/** Ikon Lucide tiap tab. */
const IKON = {
  index: "house",
  tagihan: "users-round",
  notifikasi: "bell",
} as const;

/**
 * Tab kolektor: (mode) · Beranda · Tagihan · Notifikasi · (+). Tombol kiri =
 * huruf mode aktif (H/M/T/S), membuka lembar Ganti Mode. Warna tab aktif & +
 * mengikuti mode; + membuka akad berjenis mode itu (tidak ada + di mode Semua).
 */
export default function TabKolektor() {
  const WARNA = useWarna();
  const mode = useMode();
  const warnaMode = useWarnaMode(mode);
  const hariIni = useHariIni();
  const [lembarMode, setLembarMode] = useState(false);
  const jenis = jenisDariMode(mode);

  // Gerbang (C4) hanya untuk menjelaskan lebih awal — server tetap memutuskan.
  const tambah = () => {
    const gerbang = hariIni.data ? bacaGerbang(hariIni.data) : null;
    if (!gerbang || gerbang.buka) {
      router.push({ pathname: "/kolektor/akad", params: jenis ? { jenis } : {} });
    } else if (gerbang.perluAbsen) {
      Alert.alert("Absen dulu", "Akad baru bisa dicatat sesudah absen pagi di Beranda.");
    } else {
      Alert.alert(gerbang.judul ?? "Lapangan tutup", gerbang.isi);
    }
  };

  return (
    <>
      <Tabs
        tabBar={(p) => (
          <TabMengambang
            {...p}
            ikon={IKON}
            warna={warnaMode}
            kiri={{
              isi: <HurufMode mode={mode} />,
              label: `Mode ${MODE[mode].label}. Ketuk untuk ganti mode.`,
              onPress: () => setLembarMode(true),
            }}
            tambah={
              jenis
                ? { label: `Akad baru ${MODE[mode].label.toLowerCase()}`, onPress: tambah }
                : undefined
            }
          />
        )}
        screenOptions={{
          headerTitleStyle: { color: WARNA.teks, fontWeight: TEBAL.tebal },
          headerStyle: { backgroundColor: WARNA.latar },
          headerShadowVisible: false,
          sceneStyle: { backgroundColor: WARNA.latar },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Beranda" }} />
        <Tabs.Screen name="tagihan" options={{ title: "Tagihan", headerShown: false }} />
        <Tabs.Screen name="notifikasi" options={{ title: "Notifikasi" }} />
      </Tabs>
      <LembarMode terbuka={lembarMode} onTutup={() => setLembarMode(false)} />
    </>
  );
}
