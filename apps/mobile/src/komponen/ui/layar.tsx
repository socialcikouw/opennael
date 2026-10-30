import type { ReactNode } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWarna } from "@/komponen/ui/tampilan";
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

/** Isi layar bergulir (layar ber-header Stack); keyboard tidak menutupi isian. */
export function Gulir({ children }: { children: ReactNode }) {
  const g = useG();
  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={g.gulirIsi}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
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
