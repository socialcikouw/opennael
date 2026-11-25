import { Tabs } from "expo-router/js-tabs";
import { TabBarMode, usePasangMode } from "@/fitur/mode";
import { OPSI_TAB } from "@/tema";

const IKON = {
  ringkasan: "receipt-text",
  performa: "chart-column-increasing",
} as const;

/** MODE REKAP — tab Ringkasan · Performa · Portofolio, tombol Foto Nasabah (bertahap). */
export default function TataLetakRekap() {
  usePasangMode("rekap");
  return (
    <Tabs
      backBehavior="none"
      tabBar={(p) => <TabBarMode {...p} mode="rekap" ikon={IKON} />}
      screenOptions={OPSI_TAB}
    >
      <Tabs.Screen name="ringkasan" options={{ title: "Ringkasan" }} />
      <Tabs.Screen name="performa" options={{ title: "Performa" }} />
    </Tabs>
  );
}
