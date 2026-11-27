import { Tabs } from "expo-router/js-tabs";
import { TabBarRekap } from "@/fitur/menu";
import { usePasangMode } from "@/fitur/mode";
import { OPSI_TAB } from "@/tema";

const IKON = {
  ringkasan: "receipt-text",
  performa: "chart-column-increasing",
  portofolio: "chart-pie",
} as const;

/**
 * MODE REKAP — tab Ringkasan · Performa · Portofolio (nama rute = nama tab); tombol kanan =
 * MENU (lembar ubin layar jarang: Gaji, Foto Nasabah, …; opsi C, 28 Nov 2026).
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
      <Tabs.Screen name="ringkasan" options={{ title: "Ringkasan", headerShown: false }} />
      <Tabs.Screen name="performa" options={{ title: "Performa", headerShown: false }} />
      <Tabs.Screen name="portofolio" options={{ title: "Portofolio", headerShown: false }} />
    </Tabs>
  );
}
