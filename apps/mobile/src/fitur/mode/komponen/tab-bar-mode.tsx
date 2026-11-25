import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useState } from "react";
import { TabMengambang } from "@/komponen/tab-mengambang";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { AKSEN } from "@/tema";
import { MODE, type Mode } from "../mode";
import { HurufMode } from "./huruf-mode";
import { LembarMode } from "./lembar-mode";

/**
 * TAB BAR MODE — `TabMengambang` untuk satu grup mode: tombol kiri = huruf mode yang membuka
 * lembar Ganti Mode (tiga pilihan), tab-tab grup itu, dan aksi utama mode di kanan
 * (opsional). Dipakai `app/kolektor/(kerja|rekap|akun)/_layout.tsx`.
 */
export function TabBarMode(
  props: BottomTabBarProps & {
    mode: Mode;
    ikon: Record<string, NamaIkon>;
    lencana?: Record<string, number>;
    kanan?: { ikon: NamaIkon; label: string; onPress: () => void };
  },
) {
  const [lembar, setLembar] = useState(false);
  const { mode, ...sisa } = props;
  return (
    <>
      <TabMengambang
        {...sisa}
        warna={AKSEN}
        kiri={{
          isi: <HurufMode mode={mode} bergerak />,
          label: `Mode ${MODE[mode].label}. Ketuk untuk ganti mode.`,
          onPress: () => setLembar(true),
        }}
      />
      <LembarMode terbuka={lembar} onTutup={() => setLembar(false)} />
    </>
  );
}
