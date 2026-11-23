import { judul } from "@opennael/format";
import { Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { WARNA } from "@/tema";
import { g } from "./gaya-bersama";
import { Ikon } from "./ikon";

type GayaSpanduk = Record<
  "kuning" | "merah" | "hijau",
  { kotak: { backgroundColor: string; borderColor: string }; ikon: NamaIkon; warna: string }
>;

const GAYA_SPANDUK: GayaSpanduk = {
  kuning: {
    kotak: { backgroundColor: WARNA.waspadaLembut, borderColor: WARNA.waspadaGaris },
    ikon: "triangle-alert",
    warna: WARNA.waspada,
  },
  merah: {
    kotak: { backgroundColor: WARNA.bahayaLembut, borderColor: WARNA.bahayaGaris },
    ikon: "circle-alert",
    warna: WARNA.bahaya,
  },
  hijau: {
    kotak: { backgroundColor: WARNA.suksesLembut, borderColor: WARNA.suksesGaris },
    ikon: "circle-check",
    warna: WARNA.sukses,
  },
};

/** Pengumuman di atas layar (gerbang tertutup, peringatan uang). */
export function Spanduk(props: {
  judul: string;
  isi?: string | undefined;
  warna?: keyof GayaSpanduk;
}) {
  const gaya = GAYA_SPANDUK[props.warna ?? "kuning"];
  return (
    <View style={[g.kotakPesan, g.spanduk, gaya.kotak]}>
      <Ikon nama={gaya.ikon} warna={gaya.warna} />
      <View style={g.spandukIsi}>
        <Text style={g.spandukJudul}>{judul(props.judul)}</Text>
        {props.isi ? <Text style={g.spandukTeks}>{props.isi}</Text> : null}
      </View>
    </View>
  );
}
