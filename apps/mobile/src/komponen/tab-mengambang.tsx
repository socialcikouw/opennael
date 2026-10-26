import type { BottomTabBarProps } from "expo-router/js-tabs";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGaya, useWarna } from "./tampilan";
import { BAYANGAN, HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "./tema";
import { Ikon, type NamaIkon } from "./ui";

/** Tinggi pil tab. */
const TINGGI = 64;
/** Diameter tombol bulat di kiri (mode) & kanan (+) pil. */
const TOMBOL = 56;
/** Jarak pil dari tepi bawah area aman. */
const JARAK_BAWAH = RUANG[3];

/**
 * Ruang kosong di bawah isi layar ber-tab, supaya butir terakhir tidak
 * tertutup tab bar mengambang.
 */
export function useRuangTab(): number {
  return useSafeAreaInsets().bottom + JARAK_BAWAH + TINGGI + RUANG[4];
}

/**
 * TAB BAR MENGAMBANG — (kiri) · pil berisi tab-tab layar · (+). Judul dari
 * `title` tiap layar; ikon Lucide per nama rute. Tab aktif & tombol + memakai
 * `warna` (warna mode aplikasi; bawaan hijau merek). Tombol kiri & + tidak
 * tampil bila tak diberikan (mis. mode Semua tanpa +).
 */
export function TabMengambang({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
  ikon,
  warna,
  kiri,
  tambah,
}: BottomTabBarProps & {
  ikon: Record<string, NamaIkon>;
  warna?: WarnaMode;
  kiri?: { isi: ReactNode; label: string; onPress: () => void };
  tambah?: { label: string; onPress: () => void };
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const aksen = warna ?? {
    teks: WARNA.utama,
    lembut: WARNA.utamaMuda,
    isi: WARNA.utamaIsi,
    teksIsi: WARNA.teksAtasUtama,
  };
  return (
    <View pointerEvents="box-none" style={[gaya.wadah, { bottom: insets.bottom + JARAK_BAWAH }]}>
      {kiri ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={kiri.label}
          onPress={kiri.onPress}
          style={({ pressed }) => [gaya.bulat, gaya.kiri, pressed ? gaya.ditekan : null]}
        >
          {kiri.isi}
        </Pressable>
      ) : null}
      <View style={gaya.pil}>
        {state.routes.map((route, i) => {
          const judul = descriptors[route.key]?.options.title ?? route.name;
          const ikonTab = ikon[route.name] ?? "circle";
          const aktif = i === state.index;
          const warnaTab = aktif ? aksen.teks : WARNA.redup;
          const tekan = () => {
            const e = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!aktif && !e.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: aktif }}
              accessibilityLabel={judul}
              onPress={tekan}
              style={({ pressed }) => [gaya.tab, pressed ? gaya.ditekan : null]}
            >
              <View style={[gaya.ikonTab, aktif ? { backgroundColor: aksen.lembut } : null]}>
                <Ikon nama={ikonTab} ukuran={26} warna={warnaTab} tebal={aktif} />
              </View>
              <Text style={[gaya.label, { color: warnaTab }]} numberOfLines={1}>
                {judul}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {tambah ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tambah.label}
          onPress={tambah.onPress}
          style={({ pressed }) => [
            gaya.bulat,
            { backgroundColor: aksen.isi },
            pressed ? gaya.ditekan : null,
          ]}
        >
          <Ikon nama="plus" ukuran={28} warna={aksen.teksIsi} tebal />
        </Pressable>
      ) : null}
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    wadah: {
      position: "absolute",
      left: RUANG[3],
      right: RUANG[3],
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[2],
    },
    pil: {
      flex: 1,
      height: TINGGI,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: SUDUT.bulat,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
      paddingHorizontal: RUANG[1],
      boxShadow: BAYANGAN.mengambang,
    },
    tab: {
      flex: 1,
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[0.5],
    },
    ditekan: { opacity: 0.6 },
    ikonTab: {
      height: 32,
      paddingHorizontal: RUANG[3],
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.bulat,
    },
    label: { ...HURUF["2xs"], fontWeight: TEBAL.biasa },
    bulat: {
      width: TOMBOL,
      height: TOMBOL,
      borderRadius: SUDUT.bulat,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: BAYANGAN.mengambang,
    },
    kiri: { borderWidth: 1, borderColor: WARNA.garis, backgroundColor: WARNA.permukaan },
  });
