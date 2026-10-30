import { useLocalSearchParams } from "expo-router";
import { LayarKasKolektor } from "@/fitur/setoran-sore/layar-kas-kolektor";

export default function KasKolektor() {
  const { kolektorId } = useLocalSearchParams<{ kolektorId: string }>();
  return <LayarKasKolektor kolektorId={kolektorId} />;
}
