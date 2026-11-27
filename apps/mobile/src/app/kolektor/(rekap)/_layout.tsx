import { Tabs } from "expo-router/js-tabs";
import { TabBarRekap } from "@/fitur/menu";
import { usePasangMode } from "@/fitur/mode";
import { OPSI_TAB } from "@/tema";

const IKON = {
  foto: "images",
  performa: "chart-column-increasing",
  portofolio: "chart-pie",
} as const;

/**
 * MODE REKAP — tab Foto · Performa · Portofolio (nama rute = nama tab); tombol kanan = MENU
 * (lembar ubin: Ringkasan, Gaji, Riwayat Kas, …; opsi C, 28 Nov 2026).
 */
export default function TataLetakRekap() {
  usePasangMode("rekap");
  return (
    <Tabs
      backBehavior="none"
      tabBar={(p) => <TabBarRekap {...p} ikon={IKON} />}
      screenOptions={OPSI_TAB}
    >
      {/* Ketiga layar Rekap memegang judul besarnya sendiri (ikut tergulung). */}
      <Tabs.Screen name="foto" options={{ title: "Foto", headerShown: false }} />
      <Tabs.Screen name="performa" options={{ title: "Performa", headerShown: false }} />
      <Tabs.Screen name="portofolio" options={{ title: "Portofolio", headerShown: false }} />
    </Tabs>
  );
}
