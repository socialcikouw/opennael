import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PenyediaTampilan, tampilan, useGelap, useWarna } from "@/komponen/ui/tampilan";
import { sesi, useSesi } from "@/lib/sesi";

export default function TataLetakAkar() {
  const [klienKueri] = useState(() => new QueryClient());

  useEffect(() => {
    void sesi.muat();
    void tampilan.muat();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={klienKueri}>
        <PenyediaTampilan>
          <Kerangka />
        </PenyediaTampilan>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Di dalam penyedia tampilan: latar layar & bilah status mengikuti mode, dan
 * penjaga sesi/peran di satu tempat. Pintu (`index`) tak dijaga: selama sesi
 * belum terbaca ia menampilkan pemuatan, lalu mengarahkan sesuai peran. Penjaga
 * ini hanya di HP — server tetap memeriksa peran di setiap permintaan.
 */
function Kerangka() {
  const WARNA = useWarna();
  const gelap = useGelap();
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
      <StatusBar style={gelap ? "light" : "dark"} />
    </>
  );
}
