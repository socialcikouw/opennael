import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import type { Stempel } from "@/fitur/lapangan";
import { DURASI, KURVA } from "@/komponen/ui/gerak";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

const PathBergerak = Animated.createAnimatedComponent(Path);

/** Diameter lingkaran centang. */
const UKURAN = 64;
/** Panjang goresan centang (jalur "M20 6 9 17l-5-5" di kotak 24, dibulatkan ke atas). */
const PANJANG_CENTANG = 24;

const KETERANGAN: Record<Stempel, string> = {
  bayar: "Dibayar",
  libur: "Libur Dicatat",
  lunas: "Lunas",
};

/** Lingkaran masuk: memudar + membesar dari 0,9 (bukan 0), ease-out. */
function lingkaranMasuk() {
  "worklet";
  const kurva = { duration: DURASI.sedang, easing: KURVA.keluar };
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.9 }] },
    animations: {
      opacity: withTiming(1, kurva),
      transform: [{ scale: withTiming(1, kurva) }],
    },
  };
}

/**
 * STEMPEL BERHASIL — menutup kartu yang baru dicatat (Bayar, Libur, Lunasi) sebelum kartu
 * turun ke "Sudah ditagih" (permintaan pemilik 24 Nov 2026, menggantikan stempel miring
 * DIBAYAR/LIBUR/LUNAS): kartu meredup, lingkaran hijau (sukses) muncul, tanda centang
 * TERGAMBAR di dalamnya, lalu "Berhasil" + jenisnya. Hijau = arti berhasil (bukan warna
 * merek). Pengurangan gerak: centang langsung utuh, hanya memudar.
 */
export function StempelBerhasil({ jenis }: { jenis: Stempel }) {
  const kurang = useReducedMotion();
  const gores = useSharedValue(kurang ? 1 : 0);
  useEffect(() => {
    if (kurang) return;
    // Centang digores sesudah lingkaran hampir utuh.
    gores.set(withDelay(140, withTiming(1, { duration: 280, easing: KURVA.keluar })));
  }, [kurang, gores]);
  const propsCentang = useAnimatedProps(() => ({
    strokeDashoffset: PANJANG_CENTANG * (1 - gores.get()),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(DURASI.kecil)}
      style={gaya.selubung}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Berhasil, ${KETERANGAN[jenis].toLowerCase()}`}
    >
      <Animated.View entering={lingkaranMasuk} style={gaya.lingkaran}>
        <Svg width={UKURAN * 0.5} height={UKURAN * 0.5} viewBox="0 0 24 24" fill="none">
          <PathBergerak
            d="M20 6 9 17l-5-5"
            stroke={WARNA.teksAtasSukses}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={PANJANG_CENTANG}
            animatedProps={propsCentang}
          />
        </Svg>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(180).duration(DURASI.sedang)} style={gaya.teks}>
        <Text style={gaya.berhasil}>Berhasil</Text>
        <Text style={gaya.jenis}>{KETERANGAN[jenis]}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const gaya = StyleSheet.create({
  // Menutup seluruh kotak kartu (rel di kiri tetap terlihat).
  selubung: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: RUANG[2],
    borderRadius: SUDUT.besar,
    backgroundColor: WARNA.tiraiSibuk,
  },
  lingkaran: {
    width: UKURAN,
    height: UKURAN,
    borderRadius: UKURAN / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.sukses,
  },
  teks: { alignItems: "center", gap: RUANG[0.5] },
  berhasil: { ...HURUF.xl, fontWeight: TEBAL.ekstra, color: WARNA.suksesTua },
  jenis: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
});
