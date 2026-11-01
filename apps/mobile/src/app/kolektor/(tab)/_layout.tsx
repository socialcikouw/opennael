import { router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useMemo, useState } from "react";
import { Alert } from "react-native";
import { bacaGerbang, useGerbangMutasi, useHariIni } from "@/fitur/lapangan";
import { useJumlahPengingat } from "@/fitur/notifikasi";
import { HurufMode, jenisDariMode, LembarMode, MODE, type ModeApp, useMode } from "@/fitur/tagihan";
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
  analitik: "chart-column-increasing",
} as const;

/**
 * Tab per mode, urut tampil (susunan pemilik, 1 Nov 2026; Tempoan mendahulukan
 * Notifikasi). Tab pertama = layar yang dibuka saat pindah ke mode itu dari tab
 * yang tak ada di sana.
 */
const TAB: Record<ModeApp, readonly string[]> = {
  harian: ["tagihan", "notifikasi", "analitik"],
  mingguan: ["tagihan", "notifikasi", "analitik"],
  tempoan: ["notifikasi", "tagihan", "analitik"],
  semua: ["index", "mutasi", "storting", "droping", "setelan"],
};

/**
 * Tab kolektor: (mode) · tab-tab · (+). Tombol kiri = huruf mode aktif
 * (H/M/T/S), membuka lembar Ganti Mode. Harian & Mingguan: Tagihan ·
 * Notifikasi · Analitik; Tempoan: Notifikasi · Tagihan · Analitik — ketiganya
 * dengan tombol + (akad berjenis mode itu). Mode Semua (pantau, tanpa +):
 * Dasbor · Mutasi (arus kas) · Storting · Droping · Setelan. Analitik & Dasbor
 * = layar yang sama (`fitur/dasbor`), isinya mengikuti mode. Warna tab aktif & +
 * mengikuti mode. Lonceng Notifikasi bertanda angka pengingat yang menunggu
 * tindakan.
 */
export default function TabKolektor() {
  const WARNA = useWarna();
  const mode = useMode();
  const warnaMode = useWarnaMode(mode);
  const hariIni = useHariIni();
  const pengingat = useJumlahPengingat();
  const [lembarMode, setLembarMode] = useState(false);
  const jenis = jenisDariMode(mode);
  // Mutasi bergembok selama masih ada nasabah wajib yang belum ditagih (C6).
  const { gerbang: gerbangMutasi } = useGerbangMutasi();
  const ikon = useMemo(
    () => ({ ...IKON, mutasi: gerbangMutasi === "siap" ? IKON.mutasi : "lock" }) as const,
    [gerbangMutasi],
  );

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
        // Tab pertama berbeda per mode: tombol kembali tak boleh melompat ke tab bawaan
        // (`index`, yang tersembunyi di mode kerja).
        backBehavior="none"
        tabBar={(p) => (
          <TabMengambang
            {...p}
            ikon={ikon}
            tampil={TAB[mode]}
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
        <Tabs.Screen name="analitik" options={{ title: "Analitik" }} />
      </Tabs>
      <LembarMode terbuka={lembarMode} onTutup={() => setLembarMode(false)} />
    </>
  );
}
