import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

/**
 * KARTU PILIHAN — satu pilihan besar di langkah akad (siapa nasabahnya, tenor, kampung,
 * nasabah yang pernah melunasi). Ketuk = memilih DAN langsung lanjut ke langkah berikutnya;
 * pilihan yang sedang dipakai bertepi terakota. `kanan` mengganti panah (mis. angsuran).
 */
export function KartuPilihan(props: {
  judul: string;
  ket?: string;
  ket2?: string;
  ikon?: NamaIkon;
  /** Huruf di lingkaran kiri (inisial nasabah) — dipakai bila tanpa `ikon`. */
  huruf?: string;
  kanan?: ReactNode;
  terpilih?: boolean;
  onPress: () => void;
}) {
  const terpilih = props.terpilih ?? false;
  return (
    <Tekan
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: terpilih }}
      style={({ pressed }) => [
        gaya.kartu,
        terpilih ? gaya.terpilih : null,
        pressed ? gaya.ditekan : null,
      ]}
    >
      {props.ikon ? (
        <View style={[gaya.ikon, terpilih ? gaya.ikonTerpilih : null]}>
          <Ikon
            nama={props.ikon}
            ukuran={24}
            warna={terpilih ? WARNA.teksAtasUtama : WARNA.utama}
          />
        </View>
      ) : props.huruf ? (
        <View style={[gaya.huruf, terpilih ? gaya.ikonTerpilih : null]}>
          <Text style={gaya.hurufTeks}>{props.huruf}</Text>
        </View>
      ) : null}
      <View style={gaya.teks}>
        <Text style={gaya.judul} numberOfLines={2}>
          {props.judul}
        </Text>
        {props.ket ? <Text style={gaya.ket}>{props.ket}</Text> : null}
        {props.ket2 ? <Text style={gaya.ket}>{props.ket2}</Text> : null}
      </View>
      {props.kanan ?? (
        <Ikon
          nama={terpilih ? "check" : "chevron-right"}
          ukuran={20}
          warna={terpilih ? WARNA.utama : WARNA.samar}
        />
      )}
    </Tekan>
  );
}

const gaya = StyleSheet.create({
  kartu: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[3],
    padding: RUANG[4],
    borderRadius: SUDUT.besar,
    borderWidth: 1.5,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  terpilih: { borderColor: WARNA.utama, backgroundColor: WARNA.utamaLembut },
  ditekan: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  ikon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.sedang,
    backgroundColor: WARNA.utamaLembut,
  },
  ikonTerpilih: { backgroundColor: WARNA.utamaIsi },
  huruf: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.utamaLembut,
  },
  hurufTeks: { ...HURUF.base, fontWeight: TEBAL.ekstra, color: WARNA.utamaTua },
  teks: { flex: 1, gap: RUANG[0.5] },
  judul: { ...HURUF.lg, fontWeight: TEBAL.tebal, color: WARNA.teks },
  ket: { ...HURUF.sm, color: WARNA.redup },
});
