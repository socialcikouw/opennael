import { useLocalSearchParams } from "expo-router";
import { LayarTagihan } from "@/fitur/tagihan";

/** Tab Harian (Mode Kerja) — daftar tagihan pinjaman harian. `segmen=droping` dari layar Gulung. */
export default function Harian() {
  const { segmen } = useLocalSearchParams<{ segmen?: string }>();
  return <LayarTagihan jenis="harian" segmen={segmen} />;
}
