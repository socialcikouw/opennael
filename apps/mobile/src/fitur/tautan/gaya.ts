import { Platform, StyleSheet } from "react-native";
import { BAYANGAN, HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";

export const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    gulir: {
      gap: RUANG[6],
      paddingHorizontal: RUANG[5],
      paddingTop: RUANG[4],
      paddingBottom: RUANG[10],
    },
    langkah: { alignItems: "flex-start" },
    nomor: {
      width: 28,
      height: 28,
      borderRadius: SUDUT.bulat,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: WARNA.utamaMuda,
    },
    nomorTeks: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.utamaTua },
    langkahTeks: { ...HURUF.base, flex: 1, paddingTop: RUANG[0.5], color: WARNA.teksLabel },
    panel: {
      alignItems: "center",
      gap: RUANG[4],
      borderRadius: SUDUT.lebar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
      padding: RUANG[6],
      boxShadow: BAYANGAN.kecil,
    },
    qr: { borderRadius: SUDUT.besar, backgroundColor: WARNA.putih, padding: RUANG[3] },
    tengah: { alignItems: "center", gap: RUANG[1] },
    kodeLabel: { ...HURUF.xs, fontWeight: TEBAL.sedang, letterSpacing: 0.6, color: WARNA.redup },
    kode: {
      ...HURUF["3xl"],
      fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
      fontWeight: TEBAL.tebal,
      letterSpacing: 4,
      color: WARNA.teks,
    },
    menunggu: {
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.utamaLembut,
      paddingHorizontal: RUANG[4],
      paddingVertical: RUANG[2],
    },
    menungguTeks: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.utamaTua },
    sinyalPutus: { ...HURUF.sm, color: WARNA.waspada },
    memuat: { height: 256, alignItems: "center", justifyContent: "center", gap: RUANG[3] },
    habis: { width: "100%", alignItems: "center", gap: RUANG[4], paddingVertical: RUANG[4] },
    ikonHabis: {
      width: 56,
      height: 56,
      borderRadius: SUDUT.bulat,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: WARNA.abu,
    },
    rataTengah: { textAlign: "center" },
    penuh: { width: "100%" },
    versi: { ...HURUF.xs, textAlign: "center", color: WARNA.redup },
  });
