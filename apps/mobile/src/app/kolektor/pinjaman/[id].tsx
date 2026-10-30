import { useLocalSearchParams } from "expo-router";
import { LayarPinjaman } from "@/fitur/lapangan/layar-pinjaman";

export default function KartuPinjaman() {
  const { id, lihat } = useLocalSearchParams<{ id: string; lihat?: string }>();
  return <LayarPinjaman id={id} lihat={lihat} />;
}
