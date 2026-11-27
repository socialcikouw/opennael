import { useLocalSearchParams } from "expo-router";
import { LayarHariKas } from "@/fitur/riwayat-kas";

/** Kas satu hari — dibuka dari Riwayat Kas. */
export default function HariKas() {
  const { tanggal } = useLocalSearchParams<{ tanggal: string }>();
  return <LayarHariKas tanggal={tanggal} />;
}
