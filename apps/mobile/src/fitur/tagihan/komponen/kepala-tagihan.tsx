import { type ReactNode, useState, useSyncExternalStore } from "react";
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { interpolate, type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";
import { TAB_KERJA, type TabKerja } from "../inti/daftar";

/** Rute kartu teratas — dilaporkan daftar, hanya didengar chip rute (menggulung tak merender ulang layar). */
export function buatSimpananRute() {
  let rute: string | null = null;
  const pendengar = new Set<() => void>();
  return {
    ambil: () => rute,
    tulis(baru: string | null) {
      if (baru === rute) return;
      rute = baru;
      for (const p of pendengar) p();
    },
    dengar(p: () => void) {
      pendengar.add(p);
      return () => {
        pendengar.delete(p);
      };
    },
  };
}
export type SimpananRute = ReturnType<typeof buatSimpananRute>;

/**
 * KEPALA layar Tagihan — melayang di atas daftar. Bagian LIPAT (merek +
 * lencana mode, tombol cari, kartu atas) terangkat & memudar saat daftar
 * digulung; bagian MENEMPEL (segmen, penanda lapangan tutup, chip rute) tetap
 * di puncak. Gulir balik memunculkan bagian lipat lagi (`lipat` dikendalikan
 * layar). Selama kolom cari terbuka, kepala tidak melipat.
 */
export function KepalaTagihan(props: {
  /** 0 = terbentang … tinggi lipat = terlipat penuh. Ditulis layar di UI thread. */
  lipat: SharedValue<number>;
  /** 0–1: latar kepala menjadi pekat bergaris saat daftar tergulung. */
  terangkat: SharedValue<number>;
  onUkurLipat: (tinggi: number) => void;
  onUkur: (tinggi: number) => void;
  mode: { label: string; warna: WarnaMode };
  kartuAtas: ReactNode;
  tab: TabKerja;
  jumlah: Record<TabKerja, number>;
  onGantiTab: (tab: TabKerja) => void;
  cari: string;
  onCari: (teks: string) => void;
  cariTerbuka: boolean;
  onCariTerbuka: (buka: boolean) => void;
  tutup: { judul: string; isi?: string | undefined } | null;
  simpananRute: SimpananRute;
  onBukaRute: () => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const atas = useSafeAreaInsets().top;
  const [tinggiLipat, setTinggiLipat] = useState(0);

  const gayaGeser = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.min(props.lipat.get(), tinggiLipat) }],
  }));
  const gayaLipat = useAnimatedStyle(() => ({
    opacity:
      tinggiLipat > 0 ? interpolate(props.lipat.get(), [0, tinggiLipat * 0.7], [1, 0], "clamp") : 1,
  }));
  const gayaKaca = useAnimatedStyle(() => ({ opacity: props.terangkat.get() }));

  return (
    <Animated.View
      style={[gaya.wadah, { paddingTop: atas }, gayaGeser]}
      onLayout={(e: LayoutChangeEvent) => props.onUkur(e.nativeEvent.layout.height)}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, gaya.kaca, gayaKaca]} />

      <Animated.View
        style={[gaya.lipat, gayaLipat]}
        onLayout={(e: LayoutChangeEvent) => {
          setTinggiLipat(e.nativeEvent.layout.height);
          props.onUkurLipat(e.nativeEvent.layout.height);
        }}
      >
        {props.cariTerbuka ? (
          <View style={gaya.barisCari}>
            <View style={gaya.kolomCari}>
              <Ikon nama="search" ukuran={17} warna={WARNA.samar} />
              <TextInput
                autoFocus
                style={gaya.teksCari}
                value={props.cari}
                onChangeText={props.onCari}
                placeholder="Cari nama atau kampung"
                placeholderTextColor={WARNA.samar}
                returnKeyType="search"
                autoCorrect={false}
                underlineColorAndroid="transparent"
              />
            </View>
            <TombolBulat
              ikon="x"
              label="Tutup pencarian"
              onPress={() => {
                props.onCari("");
                props.onCariTerbuka(false);
              }}
            />
          </View>
        ) : (
          <View style={gaya.barisJudul}>
            <View style={gaya.merek}>
              <Text style={gaya.merekTeks}>OpenNael</Text>
              <View style={[gaya.lencanaMode, { backgroundColor: props.mode.warna.lembut }]}>
                <Text style={[gaya.lencanaModeTeks, { color: props.mode.warna.teks }]}>
                  {props.mode.label}
                </Text>
              </View>
            </View>
            <TombolBulat
              ikon="search"
              label="Cari nasabah"
              warna={props.mode.warna.teks}
              onPress={() => props.onCariTerbuka(true)}
            />
          </View>
        )}
        {props.kartuAtas}
      </Animated.View>

      <View style={gaya.menempel}>
        <SegmenTab tab={props.tab} jumlah={props.jumlah} onGanti={props.onGantiTab} />
        {props.tutup ? (
          <View style={gaya.tutup}>
            <Ikon nama="clock" ukuran={14} warna={WARNA.waspada} />
            <View style={gaya.isi}>
              <Text style={gaya.tutupJudul}>{props.tutup.judul}</Text>
              {props.tutup.isi ? <Text style={gaya.tutupIsi}>{props.tutup.isi}</Text> : null}
            </View>
          </View>
        ) : null}
        <ChipRute
          simpanan={props.simpananRute}
          warna={props.mode.warna}
          onPress={props.onBukaRute}
        />
      </View>
    </Animated.View>
  );
}

function TombolBulat(props: {
  ikon: "search" | "x";
  label: string;
  warna?: string;
  onPress: () => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      hitSlop={6}
      style={({ pressed }) => [gaya.tombolBulat, pressed ? gaya.ditekan : null]}
    >
      <Ikon nama={props.ikon} ukuran={19} warna={props.warna ?? WARNA.teksKedua} />
    </Pressable>
  );
}

/**
 * Segmen bergaya iOS: alas abu, segmen aktif keping putih yang timbul. Jumlah
 * berupa lencana kecil di samping label, supaya lebar label tak bergoyang.
 */
function SegmenTab(props: {
  tab: TabKerja;
  jumlah: Record<TabKerja, number>;
  onGanti: (tab: TabKerja) => void;
}) {
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.segmen}>
      {TAB_KERJA.map((t) => {
        const aktif = t.nilai === props.tab;
        const angka = props.jumlah[t.nilai];
        return (
          <Pressable
            key={t.nilai}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktif }}
            accessibilityLabel={angka > 0 ? `${t.label}, ${angka}` : t.label}
            onPress={() => props.onGanti(t.nilai)}
            style={[gaya.keping, aktif ? gaya.kepingAktif : null]}
          >
            <Text style={[gaya.kepingTeks, aktif ? gaya.kepingTeksAktif : null]} numberOfLines={1}>
              {t.label}
            </Text>
            {angka > 0 ? (
              <View style={[gaya.lencanaAngka, aktif ? gaya.lencanaAngkaAktif : null]}>
                <Text style={[gaya.angkaTeks, aktif ? gaya.angkaTeksAktif : null]}>{angka}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Rute kelompok kartu teratas, mis. "Rute 1 - PULE BARAT : 10 = 500K" — ketuk untuk lompat rute. */
function ChipRute(props: { simpanan: SimpananRute; warna: WarnaMode; onPress: () => void }) {
  const gaya = useGaya(buatGaya);
  const rute = useSyncExternalStore(props.simpanan.dengar, props.simpanan.ambil);
  if (!rute) return <View style={gaya.chipKosong} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${rute}. Ketuk untuk lompat ke rute lain`}
      onPress={props.onPress}
      style={({ pressed }) => [
        gaya.chip,
        { backgroundColor: props.warna.lembut },
        pressed ? gaya.ditekan : null,
      ]}
    >
      <Ikon nama="map-pin" ukuran={12} warna={props.warna.teks} />
      <Text style={[gaya.chipTeks, { color: props.warna.teks }]} numberOfLines={1}>
        {rute}
      </Text>
      <Ikon nama="chevron-down" ukuran={14} warna={props.warna.teks} />
    </Pressable>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    wadah: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 },
    kaca: { backgroundColor: WARNA.latar, borderBottomWidth: 1, borderBottomColor: WARNA.garis },
    lipat: {
      gap: RUANG[3],
      paddingHorizontal: RUANG[4],
      paddingTop: RUANG[2],
      paddingBottom: RUANG[3],
    },
    barisJudul: { flexDirection: "row", alignItems: "center", gap: RUANG[3], minHeight: 40 },
    merek: { flex: 1, flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    merekTeks: { ...HURUF["2xl"], fontWeight: TEBAL.ekstra, color: WARNA.teks },
    lencanaMode: { paddingHorizontal: RUANG[2.5], paddingVertical: 2, borderRadius: SUDUT.bulat },
    lencanaModeTeks: { ...HURUF.xs, fontWeight: TEBAL.tebal },
    barisCari: { flexDirection: "row", alignItems: "center", gap: RUANG[2], minHeight: 40 },
    kolomCari: {
      flex: 1,
      height: 40,
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[2],
      paddingHorizontal: RUANG[3],
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.abu,
    },
    teksCari: { ...HURUF.base, flex: 1, paddingVertical: 0, color: WARNA.teks },
    tombolBulat: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.bulat,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    ditekan: { opacity: 0.7 },
    menempel: { gap: RUANG[2], paddingHorizontal: RUANG[4], paddingBottom: RUANG[2] },
    segmen: {
      flexDirection: "row",
      padding: 3,
      borderRadius: SUDUT.sedang,
      backgroundColor: WARNA.abuTua,
    },
    keping: {
      flex: 1,
      height: 34,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[1.5],
      borderRadius: SUDUT.kecil + 1,
    },
    kepingAktif: { backgroundColor: WARNA.permukaan },
    kepingTeks: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.teksKedua },
    kepingTeksAktif: { fontWeight: TEBAL.tebal, color: WARNA.teks },
    lencanaAngka: {
      minWidth: 20,
      paddingHorizontal: RUANG[1.5],
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.garisTegas,
    },
    lencanaAngkaAktif: { backgroundColor: WARNA.teks },
    angkaTeks: {
      ...HURUF["2xs"],
      fontWeight: TEBAL.tebal,
      textAlign: "center",
      color: WARNA.teksKedua,
      fontVariant: ["tabular-nums"],
    },
    angkaTeksAktif: { color: WARNA.permukaan },
    tutup: {
      flexDirection: "row",
      gap: RUANG[2],
      padding: RUANG[2.5],
      borderRadius: SUDUT.sedang,
      borderWidth: 1,
      borderColor: WARNA.waspadaGaris,
      backgroundColor: WARNA.waspadaLembut,
    },
    isi: { flex: 1 },
    tutupJudul: { ...HURUF.xs, fontWeight: TEBAL.tebal, color: WARNA.waspadaTua },
    tutupIsi: { ...HURUF.xs, color: WARNA.waspada },
    chip: {
      alignSelf: "flex-start",
      maxWidth: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[1],
      paddingHorizontal: RUANG[2.5],
      paddingVertical: RUANG[1],
      borderRadius: SUDUT.bulat,
    },
    chipTeks: { ...HURUF.xs, flexShrink: 1, fontWeight: TEBAL.semi },
    chipKosong: { height: 0 },
  });
