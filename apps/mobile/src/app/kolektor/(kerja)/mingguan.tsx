import { useLocalSearchParams } from "expo-router";
import { LayarTagihan } from "@/fitur/tagihan";

/** Tab Mingguan (Mode Kerja) — daftar tagihan pinjaman mingguan. `segmen=droping` dari layar Gulung. */
export default function Mingguan() {
  const { segmen } = useLocalSearchParams<{ segmen?: string }>();
  return <LayarTagihan jenis="mingguan" segmen={segmen} />;
}
