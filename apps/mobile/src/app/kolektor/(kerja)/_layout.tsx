import { judul } from "@opennael/format";
import { router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useMemo } from "react";
import { Alert } from "react-native";
import { bacaGerbang, useHariIni, useTagihan } from "@/fitur/lapangan";
import { TabBarMode, usePasangMode } from "@/fitur/mode";
import { sisaWajibPerJenis } from "@/fitur/tagihan";
import { OPSI_TAB } from "@/tema";

const IKON = {
  harian: "calendar-days",
  mingguan: "calendar-range",
  tempoan: "calendar-clock",
} as const;

type RuteKerja = keyof typeof IKON;

/**
 * MODE KERJA — tab Harian · Mingguan · Tempoan (nama rute = nama tab; isinya
 * `fitur/tagihan` berjenis tab itu). Angka merah di tab = sisa nasabah wajib ditagih hari
 * ini jenis itu. Tombol + = akad baru BERJENIS TAB YANG SEDANG DIBUKA. Lonceng Notifikasi
 * ada di kepala tiap tab (`KepalaTagihan`).
 */
export default function TataLetakKerja() {
  usePasangMode("kerja");
  const hariIni = useHariIni();
  const tagihan = useTagihan();
  const tanggal = hariIni.data?.kalender.tanggal;
  const lencana = useMemo(
    () => (tagihan.data && tanggal ? sisaWajibPerJenis(tagihan.data, tanggal) : undefined),
    [tagihan.data, tanggal],
  );

  // Gerbang (C4) hanya untuk menjelaskan lebih awal — server tetap memutuskan.
  const akad = (jenis: RuteKerja) => {
    const gerbang = hariIni.data ? bacaGerbang(hariIni.data) : null;
    if (!gerbang || gerbang.buka) {
      router.push({ pathname: "/kolektor/akad", params: { jenis } });
    } else if (gerbang.perluAbsen) {
      Alert.alert("Absen Dulu", "Akad baru bisa dicatat sesudah absen pagi (lonceng Notifikasi).");
    } else {
      Alert.alert(judul(gerbang.judul ?? "lapangan tutup"), gerbang.isi);
    }
  };

  return (
    <Tabs
      backBehavior="none"
      tabBar={(p) => {
        const jenis = (p.state.routes[p.state.index]?.name ?? "harian") as RuteKerja;
        return (
          <TabBarMode
            {...p}
            mode="kerja"
            ikon={IKON}
            lencana={lencana}
            kanan={{ ikon: "plus", label: `Akad baru ${jenis}`, onPress: () => akad(jenis) }}
          />
        );
      }}
      screenOptions={{ ...OPSI_TAB, headerShown: false }}
    >
      <Tabs.Screen name="harian" options={{ title: "Harian" }} />
      <Tabs.Screen name="mingguan" options={{ title: "Mingguan" }} />
      <Tabs.Screen name="tempoan" options={{ title: "Tempoan" }} />
    </Tabs>
  );
}
