import { useLocalSearchParams } from "expo-router";
import { LayarNasabah } from "@/fitur/lapangan/layar-nasabah";

export default function DetailNasabah() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LayarNasabah id={id} />;
}
