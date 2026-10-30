import { Stack } from "expo-router";
import { useOpsiStack } from "@/komponen/ui/tampilan";

/** Layar-layar kolektor (penjaga peran di `app/_layout.tsx`). */
export default function TataLetakKolektor() {
  const opsi = useOpsiStack();

  return (
    <Stack screenOptions={opsi}>
      <Stack.Screen name="(tab)" options={{ headerShown: false }} />
      <Stack.Screen name="pinjaman/[id]" options={{ title: "Pinjaman" }} />
      <Stack.Screen name="gulung/[id]" options={{ title: "Gulung" }} />
      <Stack.Screen name="bayar/[id]" options={{ title: "Bayar" }} />
      <Stack.Screen name="akad" options={{ title: "Akad Baru", presentation: "modal" }} />
    </Stack>
  );
}
