import { Stack } from "expo-router";
import { OPSI_STACK } from "@/tema";

/** Layar-layar kolektor (penjaga peran di `app/_layout.tsx`). */
export default function TataLetakKolektor() {
  return (
    <Stack screenOptions={OPSI_STACK}>
      <Stack.Screen name="(tab)" options={{ headerShown: false }} />
      <Stack.Screen name="nasabah/[id]" options={{ title: "Nasabah" }} />
      <Stack.Screen name="pinjaman/[id]" options={{ title: "Pinjaman" }} />
      <Stack.Screen name="gulung/[id]" options={{ title: "Gulung" }} />
      <Stack.Screen name="bayar/[id]" options={{ title: "Bayar" }} />
      <Stack.Screen name="akad" options={{ title: "Akad Baru", presentation: "modal" }} />
    </Stack>
  );
}
