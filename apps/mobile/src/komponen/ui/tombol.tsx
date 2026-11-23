import { ActivityIndicator, Text } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { WARNA } from "@/tema";
import { g } from "./gaya-bersama";
import { Ikon } from "./ikon";

const GAYA_TOMBOL = {
  utama: { kotak: { backgroundColor: WARNA.utamaIsi }, teks: WARNA.teksAtasUtama },
  kedua: {
    kotak: { backgroundColor: WARNA.permukaan, borderWidth: 1, borderColor: WARNA.garisTegas },
    teks: WARNA.teksTombol,
  },
  bahaya: {
    kotak: {
      backgroundColor: WARNA.bahayaLembut,
      borderWidth: 1,
      borderColor: WARNA.bahayaGaris,
    },
    teks: WARNA.bahaya,
  },
} as const;

export function Tombol(props: {
  judul: string;
  onPress: () => void;
  memuat?: boolean;
  jenis?: keyof typeof GAYA_TOMBOL;
  nonaktif?: boolean;
  ikon?: NamaIkon;
}) {
  const gaya = GAYA_TOMBOL[props.jenis ?? "utama"];
  const mati = props.nonaktif || props.memuat;
  return (
    <Tekan
      onPress={props.onPress}
      disabled={mati}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!mati, busy: !!props.memuat }}
      style={({ pressed }) => [
        g.tombol,
        gaya.kotak,
        pressed ? g.ditekan : null,
        mati ? g.mati : null,
      ]}
    >
      {props.memuat ? (
        <ActivityIndicator color={gaya.teks} />
      ) : (
        <>
          {props.ikon ? <Ikon nama={props.ikon} warna={gaya.teks} /> : null}
          <Text style={[g.tombolTeks, { color: gaya.teks }]}>{props.judul}</Text>
        </>
      )}
    </Tekan>
  );
}

/** Tautan teks kecil (mis. "Ganti nasabah"). */
export function TombolTeks(props: { judul: string; onPress: () => void }) {
  return (
    <Tekan
      onPress={props.onPress}
      hitSlop={10}
      style={({ pressed }) => [g.tautanTombol, pressed ? g.ditekanKuat : null]}
    >
      <Text style={g.tautan}>{props.judul}</Text>
    </Tekan>
  );
}
