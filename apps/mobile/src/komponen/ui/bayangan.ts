import { Platform, type ViewStyle } from "react-native";
import { BAYANGAN } from "@/komponen/ui/tema";

/**
 * BAYANGAN — hanya di iOS. Di Android `boxShadow` tampil sebagai kotak di
 * sekeliling benda (keputusan pemilik 14 Nov 2026), jadi di sana tepi benda
 * cukup dari garis (kartu & pil sudah berbingkai). Layar tidak memakai
 * `BAYANGAN` langsung.
 */
const iosSaja = (nilai: string): string | undefined => (Platform.OS === "ios" ? nilai : undefined);

export const bayangan = {
  kecil: iosSaja(BAYANGAN.kecil),
  sedang: iosSaja(BAYANGAN.sedang),
  mengambang: iosSaja(BAYANGAN.mengambang),
} as const;

/**
 * Tepi panel yang menempel di dasar layar (papan angka, panel gulung):
 * bayangan ke atas di iOS, garis atas di Android.
 */
export function tepiPanelBawah(garis: string): ViewStyle {
  return Platform.OS === "ios"
    ? { boxShadow: BAYANGAN.panelBawah }
    : { borderTopWidth: 1, borderTopColor: garis };
}
