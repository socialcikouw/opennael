import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { PenyediaTampilan, tampilan, useGelap, useWarna } from "../komponen/tampilan";
import { sesi } from "../lib/sesi";

export default function TataLetakAkar() {
  const [klienKueri] = useState(() => new QueryClient());

  useEffect(() => {
    void sesi.muat();
    void tampilan.muat();
  }, []);

  return (
    <QueryClientProvider client={klienKueri}>
      <PenyediaTampilan>
        <Kerangka />
      </PenyediaTampilan>
    </QueryClientProvider>
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
