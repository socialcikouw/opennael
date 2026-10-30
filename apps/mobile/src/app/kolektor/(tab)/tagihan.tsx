import { useLocalSearchParams } from "expo-router";
import { LayarTagihan } from "@/fitur/tagihan/layar-tagihan";

export default function Tagihan() {
  const { segmen } = useLocalSearchParams<{ segmen?: string }>();
  return <LayarTagihan segmen={segmen} />;
}
