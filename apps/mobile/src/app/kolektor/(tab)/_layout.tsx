import { router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useState } from "react";
import { Alert } from "react-native";
import { bacaGerbang, useHariIni } from "@/fitur/lapangan";
import { useJumlahPengingat } from "@/fitur/notifikasi";
import { HurufMode, jenisDariMode, LembarMode, MODE, useMode } from "@/fitur/tagihan";
import { TabMengambang } from "@/komponen/tab-mengambang";
import { useWarna, useWarnaMode } from "@/komponen/ui/tampilan";
import { TEBAL } from "@/komponen/ui/tema";

/** Ikon Lucide tiap tab. */
const IKON = {
  index: "layout-dashboard",
  tagihan: "users-round",
  notifikasi: "bell",
  mutasi: "arrow-left-right",
  storting: "banknote-arrow-down",
  droping: "banknote-arrow-up",
  setelan: "settings",
} as const;

/** Tab mode kerja (Harian · Mingguan · Tempoan) dan mode pantau Semua. */
const TAB_KERJA = ["index", "tagihan", "notifikasi"] as const;
const TAB_SEMUA = ["index", "mutasi", "storting", "droping", "setelan"] as const;

/**
 * Tab kolektor: (mode) · tab-tab · (+). Tombol kiri = huruf mode aktif
 * (H/M/T/S), membuka lembar Ganti Mode. Mode kerja: Dasbor · Tagihan ·
 * Notifikasi + tombol + (akad berjenis mode itu). Mode Semua (pantau, tanpa
 * +): Dasbor · Mutasi (arus kas) · Storting · Droping · Setelan. Warna tab
 * aktif & + mengikuti mode. Lonceng Notifikasi bertanda angka pengingat yang
 * menunggu tindakan.
 */
export default function TabKolektor() {
  const WARNA = useWarna();
  const mode = useMode();
  const warnaMode = useWarnaMode(mode);
  const hariIni = useHariIni();
  const pengingat = useJumlahPengingat();
  const [lembarMode, setLembarMode] = useState(false);
  const jenis = jenisDariMode(mode);

  // Gerbang (C4) hanya untuk menjelaskan lebih awal — server tetap memutuskan.
  const tambah = () => {
    const gerbang = hariIni.data ? bacaGerbang(hariIni.data) : null;
    if (!gerbang || gerbang.buka) {
      router.push({ pathname: "/kolektor/akad", params: jenis ? { jenis } : {} });
    } else if (gerbang.perluAbsen) {
      Alert.alert("Absen dulu", "Akad baru bisa dicatat sesudah absen pagi di tab Notifikasi.");
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
            tampil={jenis ? TAB_KERJA : TAB_SEMUA}
            lencana={{ notifikasi: pengingat }}
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
        <Tabs.Screen name="index" options={{ title: "Dasbor" }} />
        <Tabs.Screen name="tagihan" options={{ title: "Tagihan", headerShown: false }} />
        <Tabs.Screen name="notifikasi" options={{ title: "Notifikasi" }} />
        <Tabs.Screen name="mutasi" options={{ title: "Mutasi" }} />
        <Tabs.Screen name="storting" options={{ title: "Storting" }} />
        <Tabs.Screen name="droping" options={{ title: "Droping" }} />
        <Tabs.Screen name="setelan" options={{ title: "Setelan" }} />
      </Tabs>
      <LembarMode terbuka={lembarMode} onTutup={() => setLembarMode(false)} />
    </>
  );
}
