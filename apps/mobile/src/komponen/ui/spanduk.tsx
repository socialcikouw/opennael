import { Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { useGaya } from "@/komponen/ui/tampilan";
import type { Warna } from "@/komponen/ui/tema";
import { useG } from "./gaya-bersama";
import { Ikon } from "./ikon";

type GayaSpanduk = Record<
  "kuning" | "merah" | "hijau",
  { kotak: { backgroundColor: string; borderColor: string }; ikon: NamaIkon; warna: string }
>;

const buatGayaSpanduk = (WARNA: Warna): GayaSpanduk => ({
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
    kotak: { backgroundColor: WARNA.utamaLembut, borderColor: WARNA.utamaGaris },
    ikon: "circle-check",
    warna: WARNA.utama,
  },
});

/** Pengumuman di atas layar (gerbang tertutup, peringatan uang). */
export function Spanduk(props: {
  judul: string;
  isi?: string | undefined;
  warna?: keyof GayaSpanduk;
}) {
  const g = useG();
  const gaya = useGaya(buatGayaSpanduk)[props.warna ?? "kuning"];
  return (
    <View style={[g.kotakPesan, g.spanduk, gaya.kotak]}>
      <Ikon nama={gaya.ikon} warna={gaya.warna} />
      <View style={g.spandukIsi}>
        <Text style={g.spandukJudul}>{props.judul}</Text>
        {props.isi ? <Text style={g.spandukTeks}>{props.isi}</Text> : null}
      </View>
    </View>
  );
}
