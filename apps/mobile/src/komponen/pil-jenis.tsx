import type { JenisPinjaman } from "@opennael/domain";
import { LABEL_JENIS } from "@opennael/format";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Tekan } from "@/komponen/ui/tekan";
import { AKSEN, HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

/** Saringan jenis pinjaman: Semua atau satu jenis. */
export type SaringJenis = "semua" | JenisPinjaman;

const SARING_JENIS: readonly { nilai: SaringJenis; label: string }[] = [
  { nilai: "semua", label: "Semua" },
  { nilai: "harian", label: LABEL_JENIS.harian },
  { nilai: "mingguan", label: LABEL_JENIS.mingguan },
  { nilai: "tempoan", label: LABEL_JENIS.tempoan },
];

/**
 * PIL JENIS — saringan Semua · Harian · Mingguan · Tempoan (Ringkasan › Storting & Droping,
 * Performa). `jumlah` (opsional) = angka di tiap pil.
 */
export function PilJenis(props: {
  nilai: SaringJenis;
  jumlah?: Record<SaringJenis, number>;
  onPilih: (s: SaringJenis) => void;
}) {
  const aksen = AKSEN;
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
            accessibilityLabel={props.jumlah ? `${s.label}, ${props.jumlah[s.nilai]}` : s.label}
            onPress={() => props.onPilih(s.nilai)}
            style={[
              gaya.keping,
              aktif ? { backgroundColor: aksen.isi, borderColor: aksen.isi } : null,
            ]}
          >
            <Text style={[gaya.teks, aktif ? { color: aksen.teksIsi } : null]}>{s.label}</Text>
            {props.jumlah ? (
              <Text style={[gaya.angka, aktif ? { color: aksen.teksIsi } : null]}>
                {props.jumlah[s.nilai]}
              </Text>
            ) : null}
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
