import { useCallback, useEffect, useRef, useState } from "react";
import type { FlatList } from "react-native";
import { useAnimatedScrollHandler, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Baris } from "./inti/daftar";

/** Gulir searah (pt) sebelum bagian lipat kepala disembunyikan / dimunculkan lagi. */
const AMBANG_ARAH = 24;

/**
 * Gulungan daftar dan kepala yang melayang: bagian lipat menyembunyikan diri
 * saat digulir ke bawah dan muncul lagi saat digulir ke atas; pencarian
 * terbuka menahannya tetap terbuka.
 */
export function useKepalaMelayang(cariTerbuka: boolean) {
  const insets = useSafeAreaInsets();
  // ---- gulungan & kepala melayang ---------------------------------------
  const lipat = useSharedValue(0);
  const terangkat = useSharedValue(0);
  const tinggiLipat = useSharedValue(0);
  const terakhir = useSharedValue(0);
  const arah = useSharedValue(0);
  const cariSV = useSharedValue(0);
  useEffect(() => {
    cariSV.set(cariTerbuka ? 1 : 0);
    if (cariTerbuka) lipat.set(withTiming(0, { duration: 180 }));
  }, [cariTerbuka, cariSV, lipat]);

  const onScroll = useAnimatedScrollHandler((e) => {
    const y = Math.max(e.contentOffset.y, 0);
    const dy = y - terakhir.get();
    terakhir.set(y);
    terangkat.set(withTiming(y > 4 ? 1 : 0, { duration: 150 }));
    if (cariSV.get()) return;
    const L = tinggiLipat.get();
    if (y <= L) {
      lipat.set(y);
      arah.set(0);
      return;
    }
    const kumpul = Math.sign(dy) === Math.sign(arah.get()) ? arah.get() + dy : dy;
    arah.set(kumpul);
    if (kumpul > AMBANG_ARAH && lipat.get() < L) lipat.set(withTiming(L, { duration: 180 }));
    else if (kumpul < -AMBANG_ARAH && lipat.get() > 0) lipat.set(withTiming(0, { duration: 180 }));
  });

  const [tinggiKepala, setTinggiKepala] = useState(insets.top + 220);
  const [lipatPt, setLipatPt] = useState(0);
  const daftar = useRef<FlatList<Baris>>(null);
  const keAtas = useCallback(() => {
    lipat.set(0);
    daftar.current?.scrollToOffset({ offset: 0, animated: false });
  }, [lipat]);

  return {
    lipat,
    terangkat,
    tinggiLipat,
    onScroll,
    tinggiKepala,
    setTinggiKepala,
    lipatPt,
    setLipatPt,
    daftar,
    keAtas,
  };
}
