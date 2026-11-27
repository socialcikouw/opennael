import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useState } from "react";
import { TabBarMode } from "@/fitur/mode";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { LembarMenu } from "./lembar-menu";

/**
 * TAB BAR MODE REKAP — tab bar mode biasa (kiri: ganti mode; tengah: Foto · Performa ·
 * Portofolio) dengan tombol kanan MENU yang membuka lembar ubin (Ringkasan, Gaji, Riwayat
 * Kas, …). Opsi C, keputusan pemilik 28 Nov 2026.
 */
export function TabBarRekap(props: BottomTabBarProps & { ikon: Record<string, NamaIkon> }) {
  const [menu, setMenu] = useState(false);
  return (
    <>
      <TabBarMode
        {...props}
        mode="rekap"
        kanan={{ ikon: "layout-grid", label: "Menu", onPress: () => setMenu(true) }}
      />
      <LembarMenu terbuka={menu} onTutup={() => setMenu(false)} />
    </>
  );
}
