import { tanggal as formatTanggal } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { g } from "@/komponen/ui/gaya-bersama";
import { hariIniKantor } from "@/lib/kantor";
import { useSesi } from "@/lib/sesi";
import { HURUF, TEBAL, WARNA } from "@/tema";

/** Kepala layar kerja kasir / pengawas: tanggal kantor, sapaan, nama kantor. */
export function KepalaPeran() {
  const s = useSesi();
  if (!s) return null;
  const { pengguna } = s;
  return (
    <View style={g.tumpuk05}>
      <Text style={gaya.tanggal}>
        {formatTanggal(hariIniKantor(pengguna.kantor.zonaWaktu), "panjang")}
      </Text>
      <Text style={g.judul}>Halo, {pengguna.nama}</Text>
      <Text style={g.teksRedup}>{pengguna.kantor.nama}</Text>
    </View>
  );
}

const gaya = StyleSheet.create({
  tanggal: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.utama },
});
