import { useLocalSearchParams } from "expo-router";
import { LayarGulung } from "@/fitur/lapangan/layar-gulung";

export default function Gulung() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LayarGulung id={id} />;
}
