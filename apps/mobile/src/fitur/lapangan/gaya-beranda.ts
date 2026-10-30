import { StyleSheet } from "react-native";
import { HURUF, RUANG, TEBAL, type Warna } from "@/komponen/ui/tema";

export const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    galat: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
    isi: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
    tanggal: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.utama },
    kaki: { gap: RUANG[3], paddingTop: RUANG[4] },
  });
