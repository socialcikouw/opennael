import { ScrollView, StyleSheet, Text } from "react-native";
import { Tekan } from "@/komponen/ui/tekan";
import { AKSEN_MODE, HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { SARING_JENIS, type SaringJenis } from "../inti/jenis";

/** Pil saringan jenis pinjaman berangka (Semua · Harian · Mingguan · Tempoan). */
export function PilJenis(props: {
  nilai: SaringJenis;
  jumlah: Record<SaringJenis, number>;
  onPilih: (s: SaringJenis) => void;
}) {
  const aksen = AKSEN_MODE.laporan;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={gaya.pil}
      style={gaya.bingkai}
    >
      {SARING_JENIS.map((s) => {
        const aktif = s.nilai === props.nilai;
        return (
          <Tekan
            key={s.nilai}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktif }}
            accessibilityLabel={`${s.label}, ${props.jumlah[s.nilai]}`}
            onPress={() => props.onPilih(s.nilai)}
            style={[
              gaya.keping,
              aktif ? { backgroundColor: aksen.isi, borderColor: aksen.isi } : null,
            ]}
          >
            <Text style={[gaya.teks, aktif ? { color: aksen.teksIsi } : null]}>{s.label}</Text>
            <Text style={[gaya.angka, aktif ? { color: aksen.teksIsi } : null]}>
              {props.jumlah[s.nilai]}
            </Text>
          </Tekan>
        );
      })}
    </ScrollView>
  );
}

const gaya = StyleSheet.create({
  bingkai: { marginHorizontal: -RUANG[5], flexGrow: 0 },
  pil: { gap: RUANG[1.5], paddingHorizontal: RUANG[5] },
  keping: {
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[1.5],
    paddingHorizontal: RUANG[3],
    borderRadius: SUDUT.bulat,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  teks: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
  angka: {
    ...HURUF.xs,
    fontWeight: TEBAL.tebal,
    color: WARNA.samar,
    fontVariant: ["tabular-nums"],
  },
});
