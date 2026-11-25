import type { BottomTabBarProps } from "expo-router/js-tabs";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { type LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Animated, {
  LayoutAnimationConfig,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { GESER, HILANG, KURVA, MUNCUL } from "@/komponen/ui/gerak";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaAksen } from "@/tema";

/** Tinggi pil tab. */
const TINGGI = 64;
/** Diameter tombol bulat di kiri (mode) & kanan (+) pil. */
const TOMBOL = 56;
/** Jarak pil dari tepi bawah area aman. */
const JARAK_BAWAH = RUANG[3];
/** Celah antara tepi pil dan kapsul tab aktif. */
const CELAH = 6;

/**
 * Ruang kosong di bawah isi layar ber-tab, supaya butir terakhir tidak
 * tertutup tab bar mengambang.
 */
export function useRuangTab(): number {
  return useSafeAreaInsets().bottom + JARAK_BAWAH + TINGGI + RUANG[4];
}

/**
 * TAB BAR MENGAMBANG (rombak 24 Nov 2026, arahan pemilik: latar hitam, tab aktif warna
 * utama) — (mode) · pil HITAM HANGAT berisi tab-tab · (+).
 *
 * - Tab aktif = KAPSUL coral (`warna.isi`) dengan ikon & tulisan gelap (`warna.teksIsi`).
 *   Kapsul MELUNCUR ke tab yang diketuk (220 ms, ease-out, UI thread); tab tak aktif abu
 *   terang (`ikonTab`). Pertama tampil: kapsul langsung di tempat, tanpa meluncur.
 * - Tombol mode (kiri) = lingkaran hitam berisi huruf mode; tombol + (kanan) tetap coral
 *   pekat — aksi utama paling menonjol.
 * - Ganti mode: tab baru memudar masuk, tab lama memudar keluar, yang tetap bergeser
 *   (`GESER`); kapsul ikut ke tempat tab aktif yang baru.
 *
 * Dipakai tata letak tiap grup mode (`app/kolektor/(kerja)`, `(rekap)`, `(akun)`): satu
 * navigator Tabs per mode, jadi pil memuat semua rute navigatornya. Judul dari `title` tiap
 * layar; ikon Lucide per nama rute. Tombol kiri (huruf mode) & kanan (aksi utama mode: +
 * akad, Foto Nasabah) tak tampil bila tak diberikan.
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
  kanan,
  lencana,
}: BottomTabBarProps & {
  ikon: Record<string, NamaIkon>;
  /** Penanda angka di ikon tab menurut nama rute (mis. pengingat yang menunggu); 0 = tanpa penanda. */
  lencana?: Record<string, number>;
  warna?: WarnaAksen;
  kiri?: { isi: ReactNode; label: string; onPress: () => void };
  /** Aksi utama mode (bulat pekat di kanan pil). */
  kanan?: { ikon: NamaIkon; label: string; onPress: () => void };
}) {
  const aksen = warna ?? {
    teks: WARNA.utama,
    lembut: WARNA.utamaMuda,
    isi: WARNA.utamaIsi,
    teksIsi: WARNA.teksAtasUtama,
  };
  const rute = state.routes;
  const kunciAktif = state.routes[state.index]?.key;

  // Kapsul tab aktif: posisi & lebar tiap slot tab dicatat dari tata letak, kapsul
  // menuju slot aktif. Lebar boleh dianimasikan: kapsul absolut & tanpa anak.
  const posisi = useRef(new Map<string, { x: number; lebar: number }>());
  const x = useSharedValue(0);
  const lebar = useSharedValue(0);
  const tampak = useSharedValue(0);
  const geserKapsul = useCallback(
    (kunci: string | undefined) => {
      const p = kunci ? posisi.current.get(kunci) : undefined;
      if (!p) return;
      if (tampak.get() === 0) {
        x.set(p.x);
        lebar.set(p.lebar);
        tampak.set(1);
        return;
      }
      const kurva = { duration: 220, easing: KURVA.keluar };
      x.set(withTiming(p.x, kurva));
      lebar.set(withTiming(p.lebar, kurva));
    },
    [x, lebar, tampak],
  );
  useEffect(() => geserKapsul(kunciAktif), [kunciAktif, geserKapsul]);
  const gayaKapsul = useAnimatedStyle(() => ({
    opacity: tampak.get(),
    width: lebar.get(),
    transform: [{ translateX: x.get() }],
  }));

  return (
    <View pointerEvents="box-none" style={[gaya.wadah, { bottom: insets.bottom + JARAK_BAWAH }]}>
      <LayoutAnimationConfig skipEntering>
        {kiri ? (
          <Tekan
            accessibilityRole="button"
            accessibilityLabel={kiri.label}
            onPress={kiri.onPress}
            style={({ pressed }) => [gaya.bulat, gaya.kiri, pressed ? gaya.ditekan : null]}
          >
            {kiri.isi}
          </Tekan>
        ) : null}
        <Animated.View layout={GESER} style={gaya.pil}>
          <Animated.View
            pointerEvents="none"
            style={[gaya.kapsul, { backgroundColor: aksen.isi }, gayaKapsul]}
          />
          {rute.map((route) => {
            const judul = descriptors[route.key]?.options.title ?? route.name;
            const ikonTab = ikon[route.name] ?? "circle";
            const aktif = route.key === kunciAktif;
            const warnaTab = aktif ? aksen.teksIsi : WARNA.ikonTab;
            const menunggu = lencana?.[route.name] ?? 0;
            const tekan = () => {
              const e = emitter.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!aktif && !e.defaultPrevented) navigateToTab(route.key);
            };
            const catatPosisi = (e: LayoutChangeEvent) => {
              const { x: kiriSlot, width } = e.nativeEvent.layout;
              posisi.current.set(route.key, { x: kiriSlot, lebar: width });
              if (aktif) geserKapsul(route.key);
            };
            return (
              <Animated.View
                key={route.key}
                entering={MUNCUL}
                exiting={HILANG}
                layout={GESER}
                style={gaya.slotTab}
                onLayout={catatPosisi}
              >
                <Tekan
                  accessibilityRole="tab"
                  accessibilityState={{ selected: aktif }}
                  accessibilityLabel={menunggu > 0 ? `${judul}, ${menunggu} menunggu` : judul}
                  onPress={tekan}
                  style={({ pressed }) => [gaya.tab, pressed && !aktif ? gaya.tabDitekan : null]}
                >
                  <View>
                    <Ikon nama={ikonTab} ukuran={22} warna={warnaTab} tebal={aktif} />
                    {menunggu > 0 ? (
                      <View style={gaya.lencana}>
                        <Text style={gaya.lencanaTeks}>{menunggu > 99 ? "99+" : menunggu}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[gaya.label, aktif ? gaya.labelAktif : null, { color: warnaTab }]}
                    numberOfLines={1}
                  >
                    {judul}
                  </Text>
                </Tekan>
              </Animated.View>
            );
          })}
        </Animated.View>
        {kanan ? (
          <Animated.View entering={MUNCUL} exiting={HILANG}>
            <Tekan
              accessibilityRole="button"
              accessibilityLabel={kanan.label}
              onPress={kanan.onPress}
              style={({ pressed }) => [
                gaya.bulat,
                { backgroundColor: aksen.isi },
                pressed ? gaya.ditekan : null,
              ]}
            >
              <Ikon nama={kanan.ikon} ukuran={26} warna={aksen.teksIsi} tebal />
            </Tekan>
          </Animated.View>
        ) : null}
      </LayoutAnimationConfig>
    </View>
  );
}

const gaya = StyleSheet.create({
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
    backgroundColor: WARNA.latarTab,
    paddingHorizontal: CELAH,
  },
  // Kapsul tab aktif: di belakang tab, setinggi pil dikurangi celah; posisi & lebar dari animasi.
  kapsul: {
    position: "absolute",
    left: 0,
    top: CELAH,
    bottom: CELAH,
    borderRadius: SUDUT.bulat,
  },
  slotTab: { flex: 1, height: "100%" },
  tab: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabDitekan: { transform: [{ scale: 0.92 }] },
  ditekan: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  label: { ...HURUF["2xs"], fontWeight: TEBAL.sedang },
  labelAktif: { fontWeight: TEBAL.ekstra },
  lencana: {
    position: "absolute",
    top: -7,
    right: -11,
    minWidth: 18,
    height: 18,
    paddingHorizontal: RUANG[1],
    borderRadius: SUDUT.bulat,
    borderWidth: 2,
    borderColor: WARNA.latarTab,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.bahayaBingkai,
  },
  lencanaTeks: {
    ...HURUF["3xs"],
    fontWeight: TEBAL.ekstra,
    color: WARNA.teksAtasBahaya,
    fontVariant: ["tabular-nums"],
  },
  bulat: {
    width: TOMBOL,
    height: TOMBOL,
    borderRadius: SUDUT.bulat,
    alignItems: "center",
    justifyContent: "center",
  },
  kiri: { backgroundColor: WARNA.latarTab },
});
