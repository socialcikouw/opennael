import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { WARNA } from "@/tema";
import { g } from "./gaya-bersama";
import { Ikon } from "./ikon";

export function Kartu({ children }: { children: ReactNode }) {
  return <View style={g.kartu}>{children}</View>;
}

/** Bagian layar: judul kecil HURUF BESAR (mis. "NASABAH") di atas satu kartu isi. */
export function Bagian({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <View style={g.bagian}>
      <Text style={g.judulBagian}>{judul}</Text>
      <Kartu>{children}</Kartu>
    </View>
  );
}

/** Satu baris label — nilai (angka rata kanan). `warna` = warna teks nilai. */
export function Baris(props: { label: string; nilai: string; tebal?: boolean; warna?: string }) {
  return (
    <View style={g.barisNilai}>
      <Text style={g.barisLabel}>{props.label}</Text>
      <Text
        style={[
          g.barisAngka,
          props.tebal ? g.barisAngkaTebal : null,
          { color: props.warna ?? WARNA.teks },
        ]}
      >
        {props.nilai}
      </Text>
    </View>
  );
}

/** Angka ringkas berlabel — deret ringkasan di atas layar. */
export function KotakAngka(props: { label: string; nilai: string; ikon?: NamaIkon }) {
  return (
    <View style={g.kotakAngka}>
      <View style={g.baris1}>
        {props.ikon ? <Ikon nama={props.ikon} ukuran={14} warna={WARNA.redup} /> : null}
        <Text style={g.kotakAngkaLabel}>{props.label}</Text>
      </View>
      <Text style={g.kotakAngkaNilai}>{props.nilai}</Text>
    </View>
  );
}
