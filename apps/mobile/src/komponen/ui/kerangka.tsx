import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, type DimensionValue, Easing, View } from "react-native";
import { RUANG, SUDUT, WARNA } from "@/tema";
import { g } from "./gaya-bersama";

/** Denyut pelan (opasitas 1 ↔ 0,55) untuk seluruh kerangka; diam bila animasi dimatikan di HP. */
function useDenyut() {
  const nilai = useRef(new Animated.Value(1)).current;
  const [diam, setDiam] = useState(false);
  useEffect(() => {
    let batal = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (!batal) setDiam(v);
    });
    return () => {
      batal = true;
    };
  }, []);
  useEffect(() => {
    if (diam) {
      nilai.setValue(1);
      return;
    }
    const gerak = Animated.loop(
      Animated.sequence([
        Animated.timing(nilai, {
          toValue: 0.55,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(nilai, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    gerak.start();
    return () => gerak.stop();
  }, [diam, nilai]);
  return nilai;
}

/** Satu balok kerangka (pengganti teks/gambar yang belum termuat). */
function Balok({
  lebar = "100%",
  tinggi,
  sudut = SUDUT.kecil,
}: {
  lebar?: DimensionValue;
  tinggi: number;
  sudut?: number;
}) {
  return (
    <View
      style={{ width: lebar, height: tinggi, borderRadius: sudut, backgroundColor: WARNA.garis }}
    />
  );
}

/** Kartu kerangka: satu judul pendek dan dua baris isi. */
function KartuKerangka() {
  return (
    <View style={g.kartu}>
      <Balok lebar="45%" tinggi={16} />
      <Balok lebar="92%" tinggi={12} />
      <Balok lebar="68%" tinggi={12} />
    </View>
  );
}

/**
 * KERANGKA MUAT — pengganti pemuat berputar di layar penuh: bentuk layar yang
 * akan datang, supaya terasa lebih cepat dan isinya tak melompat. `daftar` =
 * deretan kartu (Dasbor, Notifikasi, Mutasi, Storting, Droping); `rincian` =
 * foto besar + kartu (Pinjaman, Detail Nasabah). Satu animasi untuk semua balok.
 */
export function Kerangka({
  jenis = "daftar",
  teks,
}: {
  jenis?: "daftar" | "rincian";
  teks?: string;
}) {
  const denyut = useDenyut();
  return (
    <View
      style={[g.layar, g.gulirIsi]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={teks ?? "Memuat"}
    >
      <Animated.View style={{ gap: RUANG[3], opacity: denyut }}>
        {jenis === "rincian" ? <Balok tinggi={200} sudut={SUDUT.besar} /> : null}
        {Array.from({ length: jenis === "rincian" ? 2 : 4 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: kerangka statis, urutannya tak pernah berubah
          <KartuKerangka key={i} />
        ))}
      </Animated.View>
    </View>
  );
}
