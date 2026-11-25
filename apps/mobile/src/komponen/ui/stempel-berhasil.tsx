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
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { DURASI, KURVA } from "./gerak";

const PathBergerak = Animated.createAnimatedComponent(Path);

/** Diameter lingkaran centang: di kartu, dan menutup satu layar penuh. */
const UKURAN = 64;
const UKURAN_LAYAR = 96;
/** Panjang goresan centang (jalur "M20 6 9 17l-5-5" di kotak 24, dibulatkan ke atas). */
const PANJANG_CENTANG = 24;

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
 * STEMPEL BERHASIL — transaksi baru tercatat (permintaan pemilik 24 Nov 2026): yang di
 * bawahnya meredup, lingkaran hijau (sukses) muncul, tanda centang TERGAMBAR di dalamnya,
 * lalu "Berhasil" + `keterangan`. Hijau = arti berhasil (bukan warna merek). Pengurangan
 * gerak: centang langsung utuh, hanya memudar.
 *
 * - Tanpa `layar` = menutup satu kartu Tagihan (Bayar, Libur, Lunasi) sebelum kartu turun
 *   ke "Sudah ditagih"; sudutnya mengikuti kartu.
 * - `layar` = menutup satu layar penuh, lingkaran lebih besar (akad baru tersimpan).
 */
export function StempelBerhasil({
  keterangan,
  layar = false,
}: {
  keterangan: string;
  layar?: boolean;
}) {
  const ukuran = layar ? UKURAN_LAYAR : UKURAN;
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
      style={[gaya.selubung, layar ? gaya.penuh : gaya.kartu]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Berhasil, ${keterangan.toLowerCase()}`}
    >
      <Animated.View
        entering={lingkaranMasuk}
        style={[gaya.lingkaran, { width: ukuran, height: ukuran, borderRadius: ukuran / 2 }]}
      >
        <Svg width={ukuran * 0.5} height={ukuran * 0.5} viewBox="0 0 24 24" fill="none">
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
        <Text style={[gaya.berhasil, layar ? gaya.berhasilLayar : null]}>Berhasil</Text>
        <Text style={gaya.jenis}>{keterangan}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const gaya = StyleSheet.create({
  selubung: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: RUANG[2],
    backgroundColor: WARNA.tiraiSibuk,
  },
  // Menutup seluruh kotak kartu (rel di kiri tetap terlihat).
  kartu: { borderRadius: SUDUT.besar },
  penuh: { zIndex: 10, gap: RUANG[4] },
  lingkaran: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.sukses,
  },
  teks: { alignItems: "center", gap: RUANG[0.5] },
  berhasil: { ...HURUF.xl, fontWeight: TEBAL.ekstra, color: WARNA.suksesTua },
  berhasilLayar: HURUF["2xl"],
  jenis: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
});
