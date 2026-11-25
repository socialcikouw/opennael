import { useLocalSearchParams } from "expo-router";
import { LayarTagihan } from "@/fitur/tagihan";

/** Tab Tempoan (Mode Kerja) — daftar tagihan pinjaman tempoan. `segmen=droping` dari layar Gulung. */
export default function Tempoan() {
  const { segmen } = useLocalSearchParams<{ segmen?: string }>();
  return <LayarTagihan jenis="tempoan" segmen={segmen} />;
}
