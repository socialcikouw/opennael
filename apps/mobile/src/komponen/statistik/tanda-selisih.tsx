import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { HURUF, RUANG, TEBAL, WARNA } from "@/tema";
import type { SelisihVM } from "./komposisi";

/**
 * Naik/turun terhadap pembanding: panah arah + "+Rp 250.000 (12%) vs akhir Oktober". Warna =
 * ARTI (`nada`), bukan arah: baik hijau, buruk merah, sama redup — macet yang naik merah.
 * `sorot` = di atas kartu pekat (warna terang); `kecil` = di bawah nilai baris rincian.
 */
export function TandaSelisih({
  vm,
  sorot = false,
  kecil = false,
}: {
  vm: SelisihVM;
  sorot?: boolean;
  kecil?: boolean;
}) {
  const warna = sorot
    ? vm.nada === "baik"
      ? WARNA.suksesDiAtasFoto
      : vm.nada === "buruk"
        ? WARNA.bahayaDiAtasFoto
        : WARNA.teksSorotRedup
    : vm.nada === "baik"
      ? WARNA.sukses
      : vm.nada === "buruk"
        ? WARNA.bahaya
        : WARNA.redup;
  return (
    <View style={gaya.baris}>
      {vm.arah === "tetap" ? null : (
        <Ikon
          nama={vm.arah === "naik" ? "trending-up" : "trending-down"}
          ukuran={kecil ? 11 : 14}
          warna={warna}
        />
      )}
      <Text style={[gaya.teks, kecil ? gaya.teksKecil : null, { color: warna }]} numberOfLines={1}>
        {vm.teks}
      </Text>
    </View>
  );
}

const gaya = StyleSheet.create({
  baris: { flexDirection: "row", alignItems: "center", gap: RUANG[1] },
  teks: { ...HURUF.xs, fontWeight: TEBAL.semi, flexShrink: 1 },
  teksKecil: { ...HURUF["2xs"] },
});
