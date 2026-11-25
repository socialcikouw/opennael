import { Stack } from "expo-router";
import { TiraiMode } from "@/fitur/mode";
import { OPSI_STACK } from "@/tema";

/**
 * Layar-layar kolektor (penjaga peran di `app/_layout.tsx`): tiga grup mode — `(kerja)`,
 * `(rekap)`, `(akun)`, masing-masing navigator tab sendiri — dan layar bertumpuk di atasnya.
 * `TiraiMode` di atas semuanya: layar transisi saat beralih mode.
 */
export default function TataLetakKolektor() {
  return (
    <>
      <Stack screenOptions={OPSI_STACK}>
        <Stack.Screen name="(kerja)" options={{ headerShown: false }} />
        <Stack.Screen name="(rekap)" options={{ headerShown: false }} />
        <Stack.Screen name="(akun)" options={{ headerShown: false }} />
        <Stack.Screen name="notifikasi" options={{ title: "Notifikasi" }} />
        <Stack.Screen name="foto-nasabah" options={{ title: "Foto Nasabah" }} />
        <Stack.Screen name="nasabah/[id]" options={{ title: "Nasabah" }} />
        <Stack.Screen name="pinjaman/[id]" options={{ title: "Pinjaman" }} />
        <Stack.Screen name="gulung/[id]" options={{ title: "Gulung" }} />
        <Stack.Screen name="bayar/[id]" options={{ title: "Bayar" }} />
        <Stack.Screen name="akad" options={{ title: "Akad Baru", presentation: "modal" }} />
      </Stack>
      <TiraiMode />
    </>
  );
}
