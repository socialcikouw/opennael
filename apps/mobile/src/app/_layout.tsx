import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PenyediaTampilan, tampilan, useGelap, useWarna } from "@/komponen/ui/tampilan";
import { sesi } from "@/lib/sesi";

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

/** Di dalam penyedia tampilan: latar layar & bilah status mengikuti mode. */
function Kerangka() {
  const WARNA = useWarna();
  const gelap = useGelap();
  return (
    <>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: WARNA.latar } }}
      />
      <StatusBar style={gelap ? "light" : "dark"} />
    </>
  );
}
