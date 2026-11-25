import { Tabs } from "expo-router/js-tabs";
import { TabBarMode, usePasangMode } from "@/fitur/mode";
import { OPSI_TAB } from "@/tema";

const IKON = { profil: "user-round", pengaturan: "settings", bantuan: "life-buoy" } as const;

/**
 * MODE AKUN — tab Profil · Pengaturan · Bantuan (nama rute = nama tab). Tanpa tombol kanan:
 * akun tak punya satu aksi utama; Keluar ada di dasar Pengaturan.
 */
export default function TataLetakAkun() {
  usePasangMode("akun");
  return (
    <Tabs
      backBehavior="none"
      tabBar={(p) => <TabBarMode {...p} mode="akun" ikon={IKON} />}
      screenOptions={OPSI_TAB}
    >
      <Tabs.Screen name="profil" options={{ title: "Profil" }} />
      <Tabs.Screen name="pengaturan" options={{ title: "Pengaturan" }} />
      <Tabs.Screen name="bantuan" options={{ title: "Bantuan" }} />
    </Tabs>
  );
}
