import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { sesi, useSesi } from "@/lib/sesi";
import { WARNA } from "@/tema";

export default function TataLetakAkar() {
  const [klienKueri] = useState(() => new QueryClient());

  useEffect(() => {
    void sesi.muat();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Penyedia keyboard: syarat `GulirKeyboard` (isian tak tertutup papan ketik, iOS & Android). */}
      <KeyboardProvider>
        <QueryClientProvider client={klienKueri}>
          <Kerangka />
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Kerangka tunggal: latar layar dari token, bilah status selalu terang (aplikasi
 * hanya bertema terang), dan penjaga sesi/peran di satu tempat. Pintu (`index`)
 * tak dijaga: selama sesi belum terbaca ia menampilkan pemuatan, lalu mengarahkan
 * sesuai peran. Penjaga ini hanya di HP — server tetap memeriksa peran di setiap
 * permintaan.
 */
function Kerangka() {
  const s = useSesi();
  const peran = s?.pengguna.peran;
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: WARNA.latar } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={s === null} redirectTo="/">
          <Stack.Screen name="tautkan" />
        </Stack.Protected>
        <Stack.Protected guard={peran === "kolektor"} redirectTo="/">
          <Stack.Screen name="kolektor" />
        </Stack.Protected>
        <Stack.Protected guard={peran === "kasir"} redirectTo="/">
          <Stack.Screen name="kasir" />
        </Stack.Protected>
        <Stack.Protected guard={peran === "pengawas"} redirectTo="/">
          <Stack.Screen name="pengawas" />
        </Stack.Protected>
        <Stack.Protected guard={peran === "bos"} redirectTo="/">
          <Stack.Screen name="beranda" />
        </Stack.Protected>
      </Stack>
      {/* Tema terang: ikon jam & baterai gelap. Layar kamera & foto layar penuh menimpanya dengan "light". */}
      <StatusBar style="dark" />
    </>
  );
}
