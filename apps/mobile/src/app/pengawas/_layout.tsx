import { Redirect, Stack } from "expo-router";
import { useOpsiStack } from "@/komponen/ui";
import { layarAwal } from "@/lib/peran";
import { useSesi } from "@/lib/sesi";

/** Layar-layar pengawas — hanya untuk sesi berperan pengawas. */
export default function TataLetakPengawas() {
  const opsi = useOpsiStack();
  const s = useSesi();
  if (s === undefined) return null;
  if (s === null) return <Redirect href="/tautkan" />;
  if (s.pengguna.peran !== "pengawas") return <Redirect href={layarAwal(s.pengguna.peran)} />;

  return (
    <Stack screenOptions={opsi}>
      <Stack.Screen name="index" options={{ title: "Pengawas" }} />
      <Stack.Screen name="cocokkan" options={{ title: "Cocokkan Kas" }} />
      <Stack.Screen name="tunggakan" options={{ title: "Pinjaman Menunggak" }} />
    </Stack>
  );
}
