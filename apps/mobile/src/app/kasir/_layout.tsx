import { Redirect, Stack } from "expo-router";
import { useOpsiStack } from "@/komponen/ui/tampilan";
import { layarAwal } from "@/lib/navigasi";
import { useSesi } from "@/lib/sesi";

/** Layar-layar kasir — hanya untuk sesi berperan kasir. */
export default function TataLetakKasir() {
  const opsi = useOpsiStack();
  const s = useSesi();
  if (s === undefined) return null;
  if (s === null) return <Redirect href="/tautkan" />;
  if (s.pengguna.peran !== "kasir") return <Redirect href={layarAwal(s.pengguna.peran)} />;

  return (
    <Stack screenOptions={opsi}>
      <Stack.Screen name="index" options={{ title: "Setoran Sore" }} />
      <Stack.Screen name="[kolektorId]" options={{ title: "Kolektor" }} />
    </Stack>
  );
}
