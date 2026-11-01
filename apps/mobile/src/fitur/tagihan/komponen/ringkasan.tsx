import { StyleSheet, Text, View } from "react-native";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";

/**
 * Kartu JATUH TEMPO di kepala mode Tempoan — jumlah nasabah saja. (Rasio bayar hari
 * ini pindah ke Dasbor; tempoan memang tak ditagih setiap hari.)
 */
export function KartuJatuhTempo(props: {
  r: { lewat: number; hariIni: number; pekan: number; berjalan: number };
  aksen: WarnaMode;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const sel = [
    {
      label: "Lewat",
      angka: props.r.lewat,
      warna: props.r.lewat > 0 ? WARNA.bahayaTeks : WARNA.teks,
    },
    {
      label: "Hari ini",
      angka: props.r.hariIni,
      warna: props.r.hariIni > 0 ? props.aksen.teks : WARNA.teks,
    },
    { label: "7 hari ke depan", angka: props.r.pekan, warna: WARNA.teks },
  ];
  return (
    <View style={gaya.kartu}>
      <View style={gaya.barisLabel}>
        <Text style={gaya.label}>JATUH TEMPO</Text>
        <Text style={gaya.ket}>{props.r.berjalan} tempoan berjalan</Text>
      </View>
      <View style={gaya.barisSel}>
        {sel.map((s) => (
          <View
            key={s.label}
            style={gaya.sel}
            accessible
            accessibilityLabel={`${s.label} ${s.angka} nasabah`}
          >
            <Text style={[gaya.angkaSel, { color: s.warna }]}>{s.angka}</Text>
            <Text style={gaya.ket} numberOfLines={1}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    kartu: {
      gap: RUANG[2],
      padding: RUANG[3],
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    barisLabel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    label: { ...HURUF["2xs"], fontWeight: TEBAL.ekstra, letterSpacing: 0.8, color: WARNA.redup },
    ket: { ...HURUF.xs, color: WARNA.redup },
    barisSel: { flexDirection: "row" },
    sel: { flex: 1, alignItems: "center", gap: 2 },
    angkaSel: { ...HURUF["2xl"], fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
  });
