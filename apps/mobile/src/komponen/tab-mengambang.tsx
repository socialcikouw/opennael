import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BAYANGAN, HURUF, RUANG, SUDUT, TEBAL } from "./tema";
import { Ikon, type NamaIkon, WARNA } from "./ui";

/** Tinggi pil tab (dan diameter tombol tambah). */
const TINGGI = 64;
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
 * TAB BAR MENGAMBANG — pil berisi tab-tab layar, ditambah tombol bulat (+)
 * untuk aksi utama. Judul dari `title` tiap layar; ikon Lucide per nama rute
 * — tab aktif: hijau, berlatar, garis lebih tebal.
 */
export function TabMengambang({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
  ikon,
  onTambah,
  judulTambah,
}: BottomTabBarProps & {
  ikon: Record<string, NamaIkon>;
  onTambah: () => void;
  judulTambah: string;
}) {
  return (
    <View pointerEvents="box-none" style={[gaya.wadah, { bottom: insets.bottom + JARAK_BAWAH }]}>
      <View style={gaya.pil}>
        {state.routes.map((route, i) => {
          const judul = descriptors[route.key]?.options.title ?? route.name;
          const ikonTab = ikon[route.name] ?? "circle";
          const aktif = i === state.index;
          const warna = aktif ? WARNA.utama : WARNA.redup;
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
              <View style={[gaya.ikonTab, aktif ? gaya.ikonAktif : null]}>
                <Ikon nama={ikonTab} ukuran={22} warna={warna} tebal={aktif} />
              </View>
              <Text style={[gaya.label, { color: warna }]} numberOfLines={1}>
                {judul}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={judulTambah}
        onPress={onTambah}
        style={({ pressed }) => [gaya.tambah, pressed ? gaya.tambahDitekan : null]}
      >
        <Ikon nama="plus" ukuran={30} warna={WARNA.putih} tebal />
      </Pressable>
    </View>
  );
}

const gaya = StyleSheet.create({
  wadah: {
    position: "absolute",
    left: RUANG[4],
    right: RUANG[4],
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[3],
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
    paddingHorizontal: RUANG[2],
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
    height: 28,
    paddingHorizontal: RUANG[4],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
  },
  ikonAktif: { backgroundColor: WARNA.utamaMuda },
  label: { ...HURUF.xs, fontWeight: TEBAL.semi },
  tambah: {
    width: TINGGI,
    height: TINGGI,
    borderRadius: SUDUT.bulat,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.utama,
    boxShadow: BAYANGAN.mengambang,
  },
  tambahDitekan: { backgroundColor: WARNA.utamaTua },
});
