import { StyleSheet, Text, View } from "react-native";
import { HURUF, RUANG, TEBAL, WARNA } from "@/tema";
import type { SegmenVM } from "./komposisi";

const WARNA_TERANG = [WARNA.komposisi1, WARNA.komposisi2, WARNA.komposisi3];
const WARNA_SOROT = [WARNA.komposisiSorot1, WARNA.komposisiSorot2, WARNA.komposisiSorot3];

/**
 * Bar bertumpuk + legenda persen. Lebar lewat `flex` (tanpa mengukur). `sorot` = di atas
 * kartu sorot pekat: rel tembus pandang, legenda terang.
 */
export function BarKomposisi({ segmen, sorot = false }: { segmen: SegmenVM[]; sorot?: boolean }) {
  const warna = sorot ? WARNA_SOROT : WARNA_TERANG;
  return (
    <View
      style={gaya.bungkus}
      accessible
      accessibilityLabel={segmen.map((s) => `${s.label} ${s.persenTeks}`).join(", ")}
    >
      <View style={[gaya.rel, sorot ? gaya.relSorot : null]}>
        {segmen.map((s) =>
          s.porsi > 0 ? (
            <View
              key={s.label}
              style={{ flex: s.porsi, backgroundColor: warna[s.urutan % warna.length] }}
            />
          ) : null,
        )}
      </View>
      <View style={gaya.legenda}>
        {segmen.map((s) => (
          <View key={s.label} style={gaya.item}>
            <View style={[gaya.titik, { backgroundColor: warna[s.urutan % warna.length] }]} />
            <Text style={[gaya.teks, sorot ? gaya.teksSorot : null]}>
              {s.label}{" "}
              <Text style={[gaya.persen, sorot ? gaya.persenSorot : null]}>{s.persenTeks}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const gaya = StyleSheet.create({
  bungkus: { gap: RUANG[2] },
  rel: {
    flexDirection: "row",
    height: 8,
    gap: 2,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: WARNA.isiNetral,
  },
  relSorot: { backgroundColor: WARNA.isiSorot },
  legenda: { flexDirection: "row", flexWrap: "wrap", columnGap: RUANG[3], rowGap: RUANG[1] },
  item: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
  titik: { width: 8, height: 8, borderRadius: 4 },
  teks: { ...HURUF.xs, color: WARNA.teksKedua },
  teksSorot: { color: WARNA.teksSorotRedup },
  persen: { fontWeight: TEBAL.tebal, color: WARNA.teks },
  persenSorot: { color: WARNA.teksSorot },
});
