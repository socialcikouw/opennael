import { ScrollView, StyleSheet, Text } from "react-native";
import { Tekan } from "@/komponen/ui/tekan";
import { AKSEN, HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

export interface OpsiPil<T extends string> {
  nilai: T;
  label: string;
  /** Angka kecil di samping label (mis. banyaknya butir); tanpa = tak tampil. */
  angka?: number;
}

/**
 * PIL GULIR — deret pil bergeser menyamping (periode Ringkasan, saringan jenis). Pil aktif
 * terakota berisi (`AKSEN.isi`), sisanya putih bergaris. Menjulur sampai tepi layar saat
 * digeser (margin negatif = bantalan layar `RUANG[5]`), bukan terpotong di bantalan isi.
 */
export function PilGulir<T extends string>(props: {
  opsi: readonly OpsiPil<T>[];
  nilai: T;
  onPilih: (nilai: T) => void;
}) {
  const aksen = AKSEN;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={gaya.pil}
      style={gaya.bingkai}
    >
      {props.opsi.map((o) => {
        const aktif = o.nilai === props.nilai;
        return (
          <Tekan
            key={o.nilai}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktif }}
            accessibilityLabel={o.angka === undefined ? o.label : `${o.label}, ${o.angka}`}
            onPress={() => {
              if (!aktif) props.onPilih(o.nilai);
            }}
            style={[
              gaya.keping,
              aktif ? { backgroundColor: aksen.isi, borderColor: aksen.isi } : null,
            ]}
          >
            <Text style={[gaya.teks, aktif ? { color: aksen.teksIsi } : null]}>{o.label}</Text>
            {o.angka === undefined ? null : (
              <Text style={[gaya.angka, aktif ? { color: aksen.teksIsi } : null]}>{o.angka}</Text>
            )}
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
