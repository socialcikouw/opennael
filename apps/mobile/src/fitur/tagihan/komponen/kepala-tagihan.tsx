import { type ReactNode, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { interpolate, type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaAksen } from "@/tema";
import { SEGMEN_TAGIHAN, type SegmenTagihan } from "../inti/daftar";

/**
 * KEPALA layar Tagihan (tab Harian · Mingguan · Tempoan, Mode Kerja) — melayang di atas
 * daftar. Bagian LIPAT (alis "MODE KERJA", judul "Tagihan Harian", tombol cari & lonceng
 * Notifikasi berangka, kartu atas) terangkat & memudar saat daftar
 * digulung; bagian MENEMPEL (segmen, spanduk absen / lapangan tutup) tetap
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
  /** Mis. "Tagihan Harian". */
  judul: string;
  aksen: WarnaAksen;
  /** Lonceng Notifikasi: angka merah 1 = kolektor belum absen (`useAngkaLonceng`). */
  lonceng: { jumlah: number; onPress: () => void };
  kartuAtas: ReactNode;
  segmen: SegmenTagihan;
  jumlah: Record<SegmenTagihan, number>;
  onGantiSegmen: (segmen: SegmenTagihan) => void;
  cari: string;
  onCari: (teks: string) => void;
  cariTerbuka: boolean;
  onCariTerbuka: (buka: boolean) => void;
  /**
   * Spanduk kuning di bawah segmen: belum absen (dengan tombol "Absen Sekarang") atau kabar
   * gerbang lapangan tutup; null = tanpa spanduk.
   */
  tutup: {
    judul: string;
    isi?: string | undefined;
    tombol?: { judul: string; onPress: () => void } | undefined;
  } | null;
}) {
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
              <Text style={gaya.alis}>MODE KERJA</Text>
              <Text style={gaya.merekTeks} numberOfLines={1}>
                {props.judul}
              </Text>
            </View>
            <TombolBulat
              ikon="search"
              label="Cari nasabah"
              warna={props.aksen.teks}
              onPress={() => props.onCariTerbuka(true)}
            />
            <TombolBulat
              ikon="bell"
              label={
                props.lonceng.jumlah > 0
                  ? `Notifikasi, ${props.lonceng.jumlah} menunggu`
                  : "Notifikasi"
              }
              warna={props.aksen.teks}
              angka={props.lonceng.jumlah}
              onPress={props.lonceng.onPress}
            />
          </View>
        )}
        {props.kartuAtas}
      </Animated.View>

      <View style={gaya.menempel}>
        <Segmen segmen={props.segmen} jumlah={props.jumlah} onGanti={props.onGantiSegmen} />
        {props.tutup ? (
          <View style={gaya.tutup}>
            <View style={gaya.tutupIkon}>
              <Ikon nama="clock" ukuran={16} warna={WARNA.waspada} />
            </View>
            <View style={gaya.isi}>
              <Text style={gaya.tutupJudul}>{props.tutup.judul}</Text>
              {props.tutup.isi ? <Text style={gaya.tutupIsi}>{props.tutup.isi}</Text> : null}
            </View>
            {props.tutup.tombol ? (
              <Tekan
                accessibilityRole="button"
                onPress={props.tutup.tombol.onPress}
                hitSlop={6}
                style={({ pressed }) => [gaya.tutupTombol, pressed ? gaya.ditekan : null]}
              >
                <Text style={gaya.tutupTombolTeks}>{props.tutup.tombol.judul}</Text>
              </Tekan>
            ) : null}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

function TombolBulat(props: {
  ikon: "search" | "x" | "bell";
  label: string;
  warna?: string;
  /** Angka merah di pojok (lonceng); 0 / kosong = tanpa angka. */
  angka?: number;
  onPress: () => void;
}) {
  return (
    <Tekan
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      hitSlop={6}
      style={({ pressed }) => [gaya.tombolBulat, pressed ? gaya.ditekan : null]}
    >
      <Ikon nama={props.ikon} ukuran={19} warna={props.warna ?? WARNA.teksKedua} />
      {props.angka ? (
        <View style={gaya.angkaMerah}>
          <Text style={gaya.angkaMerahTeks}>{props.angka > 9 ? "9+" : props.angka}</Text>
        </View>
      ) : null}
    </Tekan>
  );
}

/**
 * Segmen bergaris bawah (permintaan pemilik 28 Nov 2026; dulu alas abu + keping aktif):
 * tanpa latar, satu garis tipis di bawah deret; segmen aktif bergaris bawah terakota tebal
 * dan bertulisan terakota. Jumlah = lencana kecil di samping label (lebar tak bergoyang).
 */
function Segmen(props: {
  segmen: SegmenTagihan;
  jumlah: Record<SegmenTagihan, number>;
  onGanti: (segmen: SegmenTagihan) => void;
}) {
  return (
    <View style={gaya.segmen}>
      {SEGMEN_TAGIHAN.map((t) => {
        const aktif = t.nilai === props.segmen;
        const angka = props.jumlah[t.nilai];
        return (
          <Tekan
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
          </Tekan>
        );
      })}
    </View>
  );
}

const gaya = StyleSheet.create({
  wadah: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 },
  kaca: { backgroundColor: WARNA.latar, borderBottomWidth: 1, borderBottomColor: WARNA.garis },
  lipat: {
    gap: RUANG[3],
    paddingHorizontal: RUANG[4],
    paddingTop: RUANG[2],
    paddingBottom: RUANG[3],
  },
  barisJudul: { flexDirection: "row", alignItems: "center", gap: RUANG[3], minHeight: 40 },
  merek: { flex: 1, minWidth: 0 },
  alis: { ...HURUF["3xs"], fontWeight: TEBAL.ekstra, letterSpacing: 0.6, color: WARNA.samar },
  merekTeks: { ...HURUF["2xl"], fontWeight: TEBAL.ekstra, color: WARNA.teks },
  angkaMerah: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: RUANG[1],
    borderRadius: SUDUT.bulat,
    borderWidth: 2,
    borderColor: WARNA.latar,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.bahayaBingkai,
  },
  angkaMerahTeks: {
    ...HURUF["3xs"],
    fontWeight: TEBAL.ekstra,
    color: WARNA.teksAtasBahaya,
    fontVariant: ["tabular-nums"],
  },
  barisCari: { flexDirection: "row", alignItems: "center", gap: RUANG[2], minHeight: 40 },
  kolomCari: {
    flex: 1,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[2],
    paddingHorizontal: RUANG[3],
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.isiNetral,
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
    borderBottomWidth: 1,
    borderBottomColor: WARNA.garis,
  },
  keping: {
    flex: 1,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: RUANG[1.5],
    // Garis bawah segmen menimpa garis tipis deret (−1) supaya rata.
    marginBottom: -1,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  kepingAktif: { borderBottomColor: WARNA.utama },
  kepingTeks: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.teksKedua },
  kepingTeksAktif: { fontWeight: TEBAL.tebal, color: WARNA.utama },
  lencanaAngka: {
    minWidth: 20,
    paddingHorizontal: RUANG[1.5],
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.isiNetral,
  },
  lencanaAngkaAktif: { backgroundColor: WARNA.utamaLembut },
  angkaTeks: {
    ...HURUF["2xs"],
    fontWeight: TEBAL.tebal,
    textAlign: "center",
    color: WARNA.teksKedua,
    fontVariant: ["tabular-nums"],
  },
  angkaTeksAktif: { color: WARNA.utama },
  tutup: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[2.5],
    padding: RUANG[2.5],
    borderRadius: SUDUT.sedang,
    borderWidth: 1,
    borderColor: WARNA.waspadaGaris,
    backgroundColor: WARNA.waspadaLembut,
  },
  isi: { flex: 1 },
  tutupIkon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.waspadaMuda,
  },
  tutupJudul: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.waspadaTua },
  tutupIsi: { ...HURUF["2xs"], color: WARNA.teksKedua },
  tutupTombol: {
    paddingHorizontal: RUANG[3],
    paddingVertical: RUANG[2],
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.utamaIsi,
  },
  tutupTombolTeks: { ...HURUF.xs, fontWeight: TEBAL.ekstra, color: WARNA.teksAtasUtama },
});
