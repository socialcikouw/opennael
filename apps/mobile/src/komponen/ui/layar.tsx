import type { ReactNode } from "react";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { RUANG, WARNA } from "@/tema";
import { g } from "./gaya-bersama";

/** Kerangka layar tanpa header: aman dari poni & bilah navigasi. */
export function Layar({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={g.layar}>
      <View style={g.layarIsi}>{children}</View>
    </SafeAreaView>
  );
}

/**
 * ScrollView untuk layar BERISIAN: begitu isian disentuh, isinya otomatis bergulir naik
 * sampai isian itu (plus sedikit ruang di bawahnya, untuk pesan galat) berada di atas
 * papan ketik — di iOS dan Android (termasuk Android layar penuh, tempat papan ketik
 * tak lagi menyusutkan layar). Ketukan di luar isian tetap diteruskan ke tombol.
 * Wajib di bawah `KeyboardProvider` (akar `app/_layout.tsx`). Layar tanpa isian cukup
 * `ScrollView` biasa.
 */
export function GulirKeyboard(props: KeyboardAwareScrollViewProps) {
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      bottomOffset={RUANG[10]}
      {...props}
    />
  );
}

const TANPA_SEGAR = () => Promise.resolve();

/**
 * Isi layar bergulir (layar ber-header Stack); keyboard tidak menutupi isian
 * (`GulirKeyboard`). `onSegarkan` (opsional) memasang tarik-untuk-menyegarkan;
 * pemutarnya hanya menyala karena ditarik tangan (lihat `useTarikSegarkan`).
 */
export function Gulir({
  children,
  onSegarkan,
}: {
  children: ReactNode;
  onSegarkan?: () => Promise<unknown>;
}) {
  const { aktif, tarik } = useTarikSegarkan(onSegarkan ?? TANPA_SEGAR);
  return (
    <GulirKeyboard
      style={g.layar}
      contentContainerStyle={g.gulirIsi}
      keyboardDismissMode="interactive"
      refreshControl={
        onSegarkan ? <RefreshControl refreshing={aktif} onRefresh={tarik} /> : undefined
      }
    >
      {children}
    </GulirKeyboard>
  );
}

/** Pemuat penuh layar. */
export function Memuat({ teks }: { teks?: string }) {
  return (
    <View style={g.memuat}>
      <ActivityIndicator color={WARNA.utama} />
      {teks ? <Text style={g.teksRedup}>{teks}</Text> : null}
    </View>
  );
}
