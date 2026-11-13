import type { ReactNode } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWarna } from "@/komponen/ui/tampilan";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { useG } from "./gaya-bersama";

/** Kerangka layar tanpa header: aman dari poni & bilah navigasi. */
export function Layar({ children }: { children: ReactNode }) {
  const g = useG();
  return (
    <SafeAreaView style={g.layar}>
      <View style={g.layarIsi}>{children}</View>
    </SafeAreaView>
  );
}

const TANPA_SEGAR = () => Promise.resolve();

/**
 * Isi layar bergulir (layar ber-header Stack); keyboard tidak menutupi isian.
 * `onSegarkan` (opsional) memasang tarik-untuk-menyegarkan; pemutarnya hanya
 * menyala karena ditarik tangan (lihat `useTarikSegarkan`).
 */
export function Gulir({
  children,
  onSegarkan,
}: {
  children: ReactNode;
  onSegarkan?: () => Promise<unknown>;
}) {
  const g = useG();
  const { aktif, tarik } = useTarikSegarkan(onSegarkan ?? TANPA_SEGAR);
  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={g.gulirIsi}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      refreshControl={
        onSegarkan ? <RefreshControl refreshing={aktif} onRefresh={tarik} /> : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/** Pemuat penuh layar. */
export function Memuat({ teks }: { teks?: string }) {
  const WARNA = useWarna();
  const g = useG();
  return (
    <View style={g.memuat}>
      <ActivityIndicator color={WARNA.utama} />
      {teks ? <Text style={g.teksRedup}>{teks}</Text> : null}
    </View>
  );
}
