import { router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { Alert } from "react-native";
import { TabMengambang } from "../../../komponen/tab-mengambang";
import { TEBAL } from "../../../komponen/tema";
import { WARNA } from "../../../komponen/ui";
import { bacaGerbang, useHariIni } from "../../../lib/lapangan";

/** Ikon Lucide tiap tab. */
const IKON = {
  index: "house",
  tagihan: "users-round",
  notifikasi: "bell",
} as const;

/**
 * Tab kolektor: Beranda · Tagihan · Notifikasi, dan (+) untuk akad baru
 * (orang baru atau nasabah lama pinjam lagi).
 */
export default function TabKolektor() {
  const hariIni = useHariIni();

  // Gerbang (C4) hanya untuk menjelaskan lebih awal — server tetap memutuskan.
  const tambah = () => {
    const gerbang = hariIni.data ? bacaGerbang(hariIni.data) : null;
    if (!gerbang || gerbang.buka) {
      router.push("/kolektor/akad");
    } else if (gerbang.perluAbsen) {
      Alert.alert("Absen dulu", "Akad baru bisa dicatat sesudah absen pagi di Beranda.");
    } else {
      Alert.alert(gerbang.judul ?? "Lapangan tutup", gerbang.isi);
    }
  };

  return (
    <Tabs
      tabBar={(p) => <TabMengambang {...p} ikon={IKON} onTambah={tambah} judulTambah="Akad baru" />}
      screenOptions={{
        headerTitleStyle: { color: WARNA.teks, fontWeight: TEBAL.tebal },
        headerStyle: { backgroundColor: WARNA.latar },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: WARNA.latar },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Beranda" }} />
      <Tabs.Screen name="tagihan" options={{ title: "Tagihan" }} />
      <Tabs.Screen name="notifikasi" options={{ title: "Notifikasi" }} />
    </Tabs>
  );
}
