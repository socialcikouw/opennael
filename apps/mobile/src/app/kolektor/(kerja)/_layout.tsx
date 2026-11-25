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

/**
 * MODE KERJA — tab Harian · Mingguan · Tempoan (nama rute = nama tab; isinya
 * `fitur/tagihan` berjenis tab itu). Angka merah di tab = sisa nasabah wajib ditagih hari
 * ini jenis itu. Tombol + = akad baru (jenisnya dipilih di dalam akad, bukan ikut tab —
 * koreksi pemilik 26 Nov 2026). Lonceng Notifikasi
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
  const akad = () => {
    const gerbang = hariIni.data ? bacaGerbang(hariIni.data) : null;
    if (!gerbang || gerbang.buka) {
      router.push("/kolektor/akad");
    } else if (gerbang.perluAbsen) {
      Alert.alert("Absen Dulu", "Akad baru bisa dicatat sesudah absen pagi (lonceng Notifikasi).");
    } else {
      Alert.alert(judul(gerbang.judul ?? "lapangan tutup"), gerbang.isi);
    }
  };

  return (
    <Tabs
      backBehavior="none"
      tabBar={(p) => (
        <TabBarMode
          {...p}
          mode="kerja"
          ikon={IKON}
          lencana={lencana}
          kanan={{ ikon: "plus", label: "Akad baru", onPress: akad }}
        />
      )}
      screenOptions={{ ...OPSI_TAB, headerShown: false }}
    >
      <Tabs.Screen name="harian" options={{ title: "Harian" }} />
      <Tabs.Screen name="mingguan" options={{ title: "Mingguan" }} />
      <Tabs.Screen name="tempoan" options={{ title: "Tempoan" }} />
    </Tabs>
  );
}
