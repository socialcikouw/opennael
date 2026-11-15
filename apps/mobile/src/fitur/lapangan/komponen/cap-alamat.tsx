import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { HURUF, RUANG, TEBAL, WARNA } from "@/tema";

/**
 * CAP ALAMAT — alamat titik rumah yang menempel di dasar foto, seperti cap kamera
 * geotag: pita gelap tembus pandang selebar foto, ikon pin, lalu satu baris per tingkat
 * (jalan · desa, kecamatan · kabupaten, provinsi) dengan huruf terkecil yang masih
 * terbaca. Baris yang kepanjangan dipotong di satu baris, tak pernah melipat ke bawah.
 * Tak menangkap sentuhan (ketuk foto tetap membuka / menutup layar penuh). `bawah` =
 * tambahan isian dasar (layar penuh: tepi aman).
 */
export function CapAlamat({ baris, bawah = 0 }: { baris: readonly string[]; bawah?: number }) {
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel={`Alamat titik rumah: ${baris.join(", ")}`}
      style={[gaya.pita, { paddingBottom: RUANG[1.5] + bawah }]}
    >
      <View style={gaya.pin}>
        <Ikon nama="map-pin" ukuran={11} warna={WARNA.diAtasFoto} />
      </View>
      <View style={gaya.baris}>
        {baris.map((b, i) => (
          <Text key={b} numberOfLines={1} style={i === 0 ? gaya.utama : gaya.lain}>
            {b}
          </Text>
        ))}
      </View>
    </View>
  );
}

const gaya = StyleSheet.create({
  pita: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: RUANG[1.5],
    paddingTop: RUANG[1.5],
    paddingHorizontal: RUANG[2.5],
    backgroundColor: WARNA.tiraiGelap,
  },
  pin: { paddingTop: 1 },
  baris: { flex: 1, minWidth: 0 },
  utama: { ...HURUF["3xs"], fontWeight: TEBAL.tebal, color: WARNA.diAtasFoto },
  lain: { ...HURUF["3xs"], fontWeight: TEBAL.sedang, color: WARNA.diAtasFoto, opacity: 0.9 },
});
