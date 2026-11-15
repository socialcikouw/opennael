import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useGaya } from "@/komponen/ui/tampilan";
import { HURUF, TEBAL, type Warna } from "@/tema";

/**
 * Tabungan nasabah tak dipampang: "••••" sampai diketuk (layar sering terbuka
 * di depan orang lain). `besar` = ukuran nilai di baris detail nasabah.
 */
export function TabunganRahasia({ nilai, besar }: { nilai: string; besar?: boolean }) {
  const gaya = useGaya(buatGaya);
  const [buka, setBuka] = useState(false);
  return (
    <Pressable
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
    </Pressable>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    kecil: { ...HURUF.xs, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
    besar: {
      ...HURUF.base,
      fontWeight: TEBAL.semi,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
  });
