import { Tabs } from "expo-router/js-tabs";
import { TabBarMode, usePasangMode } from "@/fitur/mode";
import { OPSI_TAB } from "@/tema";

const IKON = { profil: "user-round" } as const;

/** MODE AKUN — tab Profil · Pengaturan · Bantuan (bertahap). */
export default function TataLetakAkun() {
  usePasangMode("akun");
  return (
    <Tabs
      backBehavior="none"
      tabBar={(p) => <TabBarMode {...p} mode="akun" ikon={IKON} />}
      screenOptions={OPSI_TAB}
    >
      <Tabs.Screen name="profil" options={{ title: "Profil" }} />
    </Tabs>
  );
}
