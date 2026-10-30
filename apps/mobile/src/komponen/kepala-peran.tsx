import { tanggal as formatTanggal } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { hariIniKantor } from "../lib/peran";
import { useSesi } from "../lib/sesi";
import { useGaya } from "./tampilan";
import { HURUF, TEBAL, type Warna } from "./tema";
import { useG } from "./ui";

/** Kepala layar kerja kasir / pengawas: tanggal kantor, sapaan, nama kantor. */
export function KepalaPeran() {
  const gaya = useGaya(buatGaya);
  const g = useG();
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

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    tanggal: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.utama },
  });
