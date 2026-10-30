import { Stack } from "expo-router";
import { useOpsiStack } from "@/komponen/ui/tampilan";

/** Layar-layar pengawas (penjaga peran di `app/_layout.tsx`). */
export default function TataLetakPengawas() {
  const opsi = useOpsiStack();

  return (
    <Stack screenOptions={opsi}>
      <Stack.Screen name="index" options={{ title: "Pengawas" }} />
      <Stack.Screen name="cocokkan" options={{ title: "Cocokkan Kas" }} />
      <Stack.Screen name="tunggakan" options={{ title: "Pinjaman Menunggak" }} />
    </Stack>
  );
}
