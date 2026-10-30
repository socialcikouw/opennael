import { useLocalSearchParams } from "expo-router";
import { LayarBayar } from "@/fitur/lapangan/layar-bayar";

export default function Bayar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LayarBayar id={id} />;
}
