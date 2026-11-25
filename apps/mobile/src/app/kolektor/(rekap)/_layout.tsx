import { router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { TabBarMode, usePasangMode } from "@/fitur/mode";
import { OPSI_TAB } from "@/tema";

const IKON = {
  ringkasan: "receipt-text",
  performa: "chart-column-increasing",
  portofolio: "chart-pie",
} as const;

/**
 * MODE REKAP — tab Ringkasan · Performa · Portofolio (nama rute = nama tab); tombol kanan =
 * Foto Nasabah (galeri foto serah terima per kampung).
 */
export default function TataLetakRekap() {
  usePasangMode("rekap");
  return (
    <Tabs
      backBehavior="none"
      tabBar={(p) => (
        <TabBarMode
          {...p}
          mode="rekap"
          ikon={IKON}
          kanan={{
            ikon: "images",
            label: "Foto Nasabah",
            onPress: () => router.push("/kolektor/foto-nasabah"),
          }}
        />
      )}
      screenOptions={OPSI_TAB}
    >
      <Tabs.Screen name="ringkasan" options={{ title: "Ringkasan" }} />
      <Tabs.Screen name="performa" options={{ title: "Performa" }} />
      <Tabs.Screen name="portofolio" options={{ title: "Portofolio" }} />
    </Tabs>
  );
}
