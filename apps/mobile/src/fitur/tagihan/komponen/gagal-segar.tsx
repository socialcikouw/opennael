import { StyleSheet, View } from "react-native";
import { Spanduk } from "@/komponen/ui/spanduk";
import { RUANG } from "@/komponen/ui/tema";

/**
 * Penyegaran di latar gagal tetapi data terakhir masih ada: daftar tetap tampil,
 * spanduk ini di puncaknya (layar galat penuh hanya untuk pemuatan pertama).
 */
export function GagalSegar() {
  return (
    <View style={gaya.wadah}>
      <Spanduk
        judul="Gagal menyegarkan"
        isi="Data mungkin belum terbaru. Tarik ke bawah untuk mencoba lagi."
      />
    </View>
  );
}

const gaya = StyleSheet.create({
  wadah: { marginHorizontal: RUANG[4], marginBottom: RUANG[2] },
});
