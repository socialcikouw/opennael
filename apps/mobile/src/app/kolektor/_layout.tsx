import { Redirect, Stack } from "expo-router";
import { OPSI_STACK } from "../../komponen/ui";
import { layarAwal } from "../../lib/peran";
import { useSesi } from "../../lib/sesi";

/** Layar-layar kolektor — hanya untuk sesi berperan kolektor. */
export default function TataLetakKolektor() {
  const s = useSesi();
  if (s === undefined) return null;
  if (s === null) return <Redirect href="/tautkan" />;
  if (s.pengguna.peran !== "kolektor") return <Redirect href={layarAwal(s.pengguna.peran)} />;

  return (
    <Stack screenOptions={OPSI_STACK}>
      <Stack.Screen name="(tab)" options={{ headerShown: false }} />
      <Stack.Screen name="pinjaman/[id]" options={{ title: "Pinjaman" }} />
      <Stack.Screen name="gulung/[id]" options={{ title: "Gulung" }} />
      <Stack.Screen name="akad" options={{ title: "Akad Baru", presentation: "modal" }} />
    </Stack>
  );
}
