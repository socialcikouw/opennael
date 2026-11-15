import { Stack } from "expo-router";
import { OPSI_STACK } from "@/tema";

/** Layar-layar kasir (penjaga peran di `app/_layout.tsx`). */
export default function TataLetakKasir() {
  return (
    <Stack screenOptions={OPSI_STACK}>
      <Stack.Screen name="index" options={{ title: "Setoran Sore" }} />
      <Stack.Screen name="[kolektorId]" options={{ title: "Kolektor" }} />
    </Stack>
  );
}
