import { Stack } from "expo-router";
import { OPSI_STACK } from "@/tema";

/** Layar-layar pengawas (penjaga peran di `app/_layout.tsx`). */
export default function TataLetakPengawas() {
  return (
    <Stack screenOptions={OPSI_STACK}>
      <Stack.Screen name="index" options={{ title: "Pengawas" }} />
      <Stack.Screen name="cocokkan" options={{ title: "Cocokkan Kas" }} />
      <Stack.Screen name="tunggakan" options={{ title: "Pinjaman Menunggak" }} />
    </Stack>
  );
}
