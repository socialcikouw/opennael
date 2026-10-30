import { useLocalSearchParams } from "expo-router";
import { LayarAkad } from "@/fitur/lapangan/layar-akad";

export default function Akad() {
  const { jenis } = useLocalSearchParams<{ jenis?: string }>();
  return <LayarAkad jenis={jenis} />;
}
