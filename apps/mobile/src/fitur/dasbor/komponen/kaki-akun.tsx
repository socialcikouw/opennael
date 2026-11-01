import { StyleSheet, View } from "react-native";
import { TombolKeluar } from "@/fitur/akun";
import { PilihTampilan } from "@/komponen/pilih-tampilan";
import { RUANG } from "@/komponen/ui/tema";

/** Pengaturan akun di dasar Dasbor/Analitik (mode kerja): mode tampilan (tersimpan di HP ini) dan keluar. */
export function KakiAkun() {
  return (
    <View style={gaya.kaki}>
      <PilihTampilan />
      <TombolKeluar />
    </View>
  );
}

const gaya = StyleSheet.create({
  kaki: { gap: RUANG[3], paddingTop: RUANG[4] },
});
