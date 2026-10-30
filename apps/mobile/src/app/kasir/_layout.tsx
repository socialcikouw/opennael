import { Stack } from "expo-router";
import { useOpsiStack } from "@/komponen/ui/tampilan";

/** Layar-layar kasir (penjaga peran di `app/_layout.tsx`). */
export default function TataLetakKasir() {
  const opsi = useOpsiStack();

  return (
    <Stack screenOptions={opsi}>
      <Stack.Screen name="index" options={{ title: "Setoran Sore" }} />
      <Stack.Screen name="[kolektorId]" options={{ title: "Kolektor" }} />
    </Stack>
  );
}
