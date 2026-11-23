import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, TEBAL, WARNA } from "@/tema";

/**
 * Tabungan nasabah tak dipampang: "••••" sampai diketuk (layar sering terbuka
 * di depan orang lain). `besar` = ukuran nilai di baris detail nasabah.
 */
export function TabunganRahasia({ nilai, besar }: { nilai: string; besar?: boolean }) {
  const [buka, setBuka] = useState(false);
  return (
    <Tekan
      onPress={() => setBuka((b) => !b)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        buka
          ? `Tabungan ${nilai}. Ketuk untuk menyembunyikan`
          : "Tabungan tersembunyi. Ketuk untuk menampilkan"
      }
    >
      <Text style={besar ? gaya.besar : gaya.kecil}>{buka ? nilai : "••••"}</Text>
    </Tekan>
  );
}

const gaya = StyleSheet.create({
  kecil: { ...HURUF.xs, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
  besar: {
    ...HURUF.base,
    fontWeight: TEBAL.semi,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
});
